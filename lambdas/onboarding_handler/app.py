import json, os, urllib.parse, boto3, datetime
from botocore.exceptions import ClientError

# Env vars provided via Terraform
# Either `ONBOARDING_TEMPLATE_URL` (public URL) or
# `ONBOARDING_TEMPLATE_S3_BUCKET` + `ONBOARDING_TEMPLATE_S3_KEY` should
# be set. If only S3 bucket/key are available, the lambda will generate
# a presigned URL for the template so Quick Create can access it.
TEMPLATE_URL = os.environ.get("ONBOARDING_TEMPLATE_URL")
TEMPLATE_S3_BUCKET = os.environ.get("ONBOARDING_TEMPLATE_S3_BUCKET")
TEMPLATE_S3_KEY = os.environ.get("ONBOARDING_TEMPLATE_S3_KEY")
TRUSTED_ACCOUNT_ID = os.environ["TRUSTED_ACCOUNT_ID"]
CUSTOMERS_TABLE = os.environ["CUSTOMERS_TABLE"]
ROLE_NAME = os.environ.get("ONBOARDING_ROLE_NAME", "CloudGoldenGuardAuditRole")

ddb = boto3.resource("dynamodb")
table = ddb.Table(CUSTOMERS_TABLE)
_s3 = boto3.client("s3")

def _response(status, body):
    return {"statusCode": status,
            "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"},
            "body": json.dumps(body)}

def quick_create_url(event, _ctx):
    body = json.loads(event.get("body") or "{}")
    account_id = body.get("accountId", "").strip()
    region     = body.get("region", "").strip()  # one region to open console in
    if not account_id or not region:
        return _response(400, {"error": "accountId and region are required"})
    # Determine template URL. Prefer a configured public URL; otherwise
    # generate a presigned GET URL for the S3 object.
    template_url = TEMPLATE_URL
    if not template_url:
        if TEMPLATE_S3_BUCKET and TEMPLATE_S3_KEY:
            try:
                template_url = _s3.generate_presigned_url(
                    "get_object",
                    Params={"Bucket": TEMPLATE_S3_BUCKET, "Key": TEMPLATE_S3_KEY},
                    ExpiresIn=3600,
                )
            except ClientError as e:
                return _response(500, {"error": "PRESIGN_FAILED", "detail": str(e)})
        else:
            return _response(500, {"error": "NO_TEMPLATE_CONFIGURED"})

    # AWS Console Quick Create CFN deep link
    # Param name must match your template’s ParameterKey (README shows TrustedAccountId).
    params = {
        "stackName": ROLE_NAME,
        "templateURL": template_url,
        "param_TrustedAccountId": TRUSTED_ACCOUNT_ID,
        "capabilities": "CAPABILITY_NAMED_IAM"
    }
    query = "&".join(f"{k}={urllib.parse.quote(str(v))}" for k, v in params.items())
    url = f"https://console.aws.amazon.com/cloudformation/home?region={region}#/stacks/quickcreate?{query}"

    return _response(200, {"quickCreateUrl": url})

def verify_and_register(event, _ctx):
    body = json.loads(event.get("body") or "{}")
    account_id = body.get("accountId", "").strip()
    regions    = body.get("regions") or []
    if not account_id or not isinstance(regions, list) or not regions:
        return _response(400, {"error": "accountId and regions[] are required"})

    # Only add the selected region(s) from the request
    selected_regions = regions

    role_arn = f"arn:aws:iam::{account_id}:role/{ROLE_NAME}"
    sts = boto3.client("sts")

    # Try to assume the role to verify it exists and is trustable
    try:
        assumed = sts.assume_role(
            RoleArn=role_arn,
            RoleSessionName="thanos-onboarding-check",
            DurationSeconds=900
        )
    except Exception as e:
        # Return a helpful message; frontend can show “stack not finished yet”
        return _response(409, {"error": "ASSUME_ROLE_FAILED", "detail": str(e), "roleArn": role_arn})

    # Use assumed credentials to query the target account for an identity/name
    creds = assumed.get("Credentials") or {}
    assumed_access_key = creds.get("AccessKeyId")
    assumed_secret_key = creds.get("SecretAccessKey")
    assumed_token = creds.get("SessionToken")

    customer_name = None
    try:
        if assumed_access_key and assumed_secret_key and assumed_token:
            iam = boto3.client(
                "iam",
                aws_access_key_id=assumed_access_key,
                aws_secret_access_key=assumed_secret_key,
                aws_session_token=assumed_token,
            )
            # Try to get the calling principal's user (if available)
            try:
                resp = iam.get_user()
                customer_name = resp.get("User", {}).get("UserName")
            except Exception:
                # Not an IAM user (likely an assumed role). Fall back to account alias.
                try:
                    resp = iam.list_account_aliases()
                    aliases = resp.get("AccountAliases", [])
                    if aliases:
                        customer_name = aliases[0]
                except Exception:
                    customer_name = None
    except Exception:
        customer_name = None

    # Upsert logic: check if account already exists for this tenant
    now = datetime.datetime.utcnow().isoformat() + "Z"
    key = {"tenant_id": "Thanos-dev", "account_id": account_id}
    existing = table.get_item(Key=key).get("Item")

    if existing:
        # Merge regions: append new region(s) if not present
        existing_regions = set(existing.get("regions", []))
        new_regions = set(selected_regions)
        merged_regions = list(existing_regions.union(new_regions))
        # Prefer discovered name, fallback to provided, else keep existing
        name = customer_name or body.get("customerName", "") or existing.get("customer_name", "")
        # Update item
        table.update_item(
            Key=key,
            UpdateExpression="SET regions = :r, customer_name = :n, role_arn = :a, status = :s, updated_at = :u",
            ExpressionAttributeValues={
                ":r": merged_regions,
                ":n": name,
                ":a": role_arn,
                ":s": "active",
                ":u": now,
            }
        )
        # Compose response item
        item = existing.copy()
        item.update({
            "regions": merged_regions,
            "customer_name": name,
            "role_arn": role_arn,
            "status": "active",
            "updated_at": now,
        })
    else:
        # New item
        item = {
            "tenant_id": "Thanos-dev",
            "account_id": account_id,
            "connectedAt": "",
            "created_at": now,
            "customer_name": customer_name or body.get("customerName", ""),
            "regions": selected_regions,
            "role_arn": role_arn,
            "status": "active",
            "updated_at": now,
        }
        table.put_item(Item=item)

    return _response(200, {"ok": True, "customer": item})

# Router (for API Gateway Lambda Proxy)
def handler(event, context):
    route = (event.get("requestContext", {}).get("http", {}).get("path") or "").lower()
    method = (event.get("requestContext", {}).get("http", {}).get("method") or "").upper()

    if route.endswith("/onboarding/quick-create-url") and method == "POST":
        return quick_create_url(event, context)
    if route.endswith("/onboarding/verify") and method == "POST":
        return verify_and_register(event, context)

    return _response(404, {"error": "not found"})
