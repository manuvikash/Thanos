"""
Lambda handler for base configuration management.
"""
import json
import os
from typing import Dict, Any
import boto3
from botocore.exceptions import ClientError

# Add parent directory to path for imports
import sys
sys.path.insert(0, '/opt/python')
sys.path.insert(0, '/var/task')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'common'))

from common.logging import get_logger
from common.config_models import BaseConfig, ConfigTemplate
from common.config_templates import get_templates_by_resource_type, get_template, list_all_templates

logger = get_logger(__name__)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
base_configs_table_name = os.environ.get('BASE_CONFIGS_TABLE', 'cloud-golden-guard-dev-base-configs')
base_configs_table = dynamodb.Table(base_configs_table_name)


def get_cors_headers() -> Dict[str, str]:
    """Get CORS headers for responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
    }


def response(status_code: int, body: Dict[str, Any]) -> Dict[str, Any]:
    """Create a response with CORS headers."""
    return {
        'statusCode': status_code,
        'headers': get_cors_headers(),
        'body': json.dumps(body)
    }


def lambda_handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    """
    Handle base configuration API requests.
    
    Routes:
        GET /base-configs                    - List all base configs
        GET /base-configs/{resource_type}    - Get base config for resource type
        POST /base-configs                   - Create/update base config
        DELETE /base-configs/{resource_type} - Delete base config
        GET /templates                       - List all templates
        GET /templates/{resource_type}       - Get templates for resource type
    """
    try:
        # Log the entire event for debugging
        logger.info(f"Received event: {json.dumps(event)}")
        
        # Support both API Gateway v1 and v2 formats
        http_method = (
            event.get('requestContext', {}).get('http', {}).get('method') or
            event.get('requestContext', {}).get('httpMethod') or
            event.get('httpMethod')
        )
        
        path = event.get('rawPath') or event.get('path', '')
        path_params = event.get('pathParameters') or {}
        
        logger.info(f"Processing {http_method} {path}")
        
        if not http_method:
            logger.error("No HTTP method found in event")
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid request - no HTTP method'})
            }
        
        # Templates endpoints
        if '/templates' in path:
            if http_method == 'GET':
                if path_params and 'resource_type' in path_params:
                    return get_templates_for_type(path_params['resource_type'])
                elif path_params and 'template_id' in path_params:
                    return get_template_by_id(path_params['template_id'])
                else:
                    return list_templates()
            elif http_method == 'POST':
                body = json.loads(event.get('body', '{}'))
                return create_template(body)
            elif http_method == 'DELETE':
                if path_params and 'template_id' in path_params:
                    return delete_template(path_params['template_id'])
        
        # Base configs endpoints
        if http_method == 'GET':
            if path_params and 'resource_type' in path_params:
                return get_base_config(path_params['resource_type'])
            else:
                return list_base_configs()
        
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_or_update_base_config(body)
        
        elif http_method == 'DELETE':
            if path_params and 'resource_type' in path_params:
                return delete_base_config(path_params['resource_type'])
        
        return {
            'statusCode': 400,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': 'Invalid request'})
        }
    
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def list_base_configs() -> Dict[str, Any]:
    """List all base configurations."""
    try:
        response = base_configs_table.scan(
            FilterExpression='begins_with(PK, :pk)',
            ExpressionAttributeValues={':pk': 'BASE_CONFIG#'}
        )
        
        configs = []
        for item in response.get('Items', []):
            try:
                config = BaseConfig.from_dynamodb(item)
                configs.append({
                    'resource_type': config.resource_type,
                    'desired_config': config.desired_config,
                    'version': config.version,
                    'editable': config.editable,
                    'created_at': config.created_at,
                    'updated_at': config.updated_at
                })
            except Exception as e:
                logger.warning(f"Error parsing base config: {e}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'configs': configs})
        }
    
    except Exception as e:
        logger.error(f"Error listing base configs: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def get_base_config(resource_type: str) -> Dict[str, Any]:
    """Get base configuration for a resource type."""
    try:
        response = base_configs_table.get_item(
            Key={
                'PK': f'BASE_CONFIG#{resource_type}',
                'SK': 'v1'
            }
        )
        
        item = response.get('Item')
        if not item:
            return {
                'statusCode': 404,
                'body': json.dumps({'error': 'Base config not found'})
            }
        
        config = BaseConfig.from_dynamodb(item)
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'resource_type': config.resource_type,
                'desired_config': config.desired_config,
                'version': config.version,
                'editable': config.editable,
                'created_at': config.created_at,
                'updated_at': config.updated_at
            })
        }
    
    except Exception as e:
        logger.error(f"Error getting base config: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def create_or_update_base_config(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create or update a base configuration."""
    try:
        resource_type = data.get('resource_type')
        desired_config = data.get('desired_config', {})
        
        if not resource_type:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'resource_type is required'})
            }
        
        base_config = BaseConfig(
            resource_type=resource_type,
            desired_config=desired_config,
            editable=data.get('editable', True),
            created_by=data.get('created_by', 'user')
        )
        
        base_configs_table.put_item(Item=base_config.to_dynamodb())
        
        logger.info(f"Created/updated base config for {resource_type}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Base config saved successfully',
                'resource_type': resource_type
            })
        }
    
    except Exception as e:
        logger.error(f"Error creating/updating base config: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def delete_base_config(resource_type: str) -> Dict[str, Any]:
    """Delete a base configuration."""
    try:
        base_configs_table.delete_item(
            Key={
                'PK': f'BASE_CONFIG#{resource_type}',
                'SK': 'v1'
            }
        )
        
        logger.info(f"Deleted base config for {resource_type}")
        
        return {
            'statusCode': 200,
            'body': json.dumps({'message': 'Base config deleted successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error deleting base config: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }


def list_templates() -> Dict[str, Any]:
    """List all configuration templates (built-in + custom)."""
    try:
        # Get built-in templates
        builtin_templates = list_all_templates()
        
        # Get custom templates from DynamoDB
        response = base_configs_table.scan(
            FilterExpression='begins_with(PK, :pk)',
            ExpressionAttributeValues={':pk': 'TEMPLATE#'}
        )
        
        custom_templates = []
        for item in response.get('Items', []):
            try:
                template = ConfigTemplate.from_dynamodb(item)
                custom_templates.append(template)
            except Exception as e:
                logger.warning(f"Error parsing template: {e}")
        
        # Combine both
        all_templates = builtin_templates + custom_templates
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'templates': [t.to_dict() for t in all_templates]
            })
        }
    
    except Exception as e:
        logger.error(f"Error listing templates: {e}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def get_templates_for_type(resource_type: str) -> Dict[str, Any]:
    """Get templates for a specific resource type (built-in + custom)."""
    try:
        # Get built-in templates
        builtin_templates = get_templates_by_resource_type(resource_type)
        
        # Get custom templates from DynamoDB
        response = base_configs_table.query(
            IndexName='GSI1',
            KeyConditionExpression='GSI1PK = :resource_type AND GSI1SK = :sk',
            ExpressionAttributeValues={
                ':resource_type': resource_type,
                ':sk': 'TEMPLATE'
            }
        )
        
        custom_templates = []
        for item in response.get('Items', []):
            try:
                template = ConfigTemplate.from_dynamodb(item)
                custom_templates.append(template)
            except Exception as e:
                logger.warning(f"Error parsing template: {e}")
        
        # Combine both
        all_templates = builtin_templates + custom_templates
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'resource_type': resource_type,
                'templates': [t.to_dict() for t in all_templates]
            })
        }
    
    except Exception as e:
        logger.error(f"Error getting templates: {e}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def get_template_by_id(template_id: str) -> Dict[str, Any]:
    """Get a specific template by ID."""
    try:
        response = base_configs_table.get_item(
            Key={
                'PK': f'TEMPLATE#{template_id}',
                'SK': 'v1'
            }
        )
        
        item = response.get('Item')
        if not item:
            return {
                'statusCode': 404,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'Template not found'})
            }
        
        template = ConfigTemplate.from_dynamodb(item)
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps(template.to_dict())
        }
    
    except Exception as e:
        logger.error(f"Error getting template: {e}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def create_template(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a custom template."""
    try:
        name = data.get('name')
        resource_type = data.get('resource_type')
        description = data.get('description', '')
        desired_config = data.get('desired_config', {})
        
        if not name or not resource_type:
            return {
                'statusCode': 400,
                'headers': get_cors_headers(),
                'body': json.dumps({'error': 'name and resource_type are required'})
            }
        
        # Generate template ID from name
        import re
        template_id = re.sub(r'[^a-z0-9-]', '-', name.lower()).strip('-')
        template_id = f"{resource_type.replace('::', '-').lower()}-{template_id}"
        
        template = ConfigTemplate(
            template_id=template_id,
            name=name,
            resource_type=resource_type,
            description=description,
            desired_config=desired_config,
            category=data.get('category', 'custom'),
            tags=data.get('tags', []),
            is_custom=True,
            created_by=data.get('created_by', 'user')
        )
        
        base_configs_table.put_item(Item=template.to_dynamodb())
        
        logger.info(f"Created template {template_id}")
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({
                'message': 'Template created successfully',
                'template': template.to_dict()
            })
        }
    
    except Exception as e:
        logger.error(f"Error creating template: {e}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }


def delete_template(template_id: str) -> Dict[str, Any]:
    """Delete a custom template."""
    try:
        base_configs_table.delete_item(
            Key={
                'PK': f'TEMPLATE#{template_id}',
                'SK': 'v1'
            }
        )
        
        logger.info(f"Deleted template {template_id}")
        
        return {
            'statusCode': 200,
            'headers': get_cors_headers(),
            'body': json.dumps({'message': 'Template deleted successfully'})
        }
    
    except Exception as e:
        logger.error(f"Error deleting template: {e}")
        return {
            'statusCode': 500,
            'headers': get_cors_headers(),
            'body': json.dumps({'error': str(e)})
        }
