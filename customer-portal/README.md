# Customer Registration Portal

Self-service portal for customers to register their AWS accounts with Cloud Golden Guard.

## Features

- **Simple Registration Form**: Customers provide their AWS account details
- **Real-time Validation**: Input validation for ARNs, account IDs, and region selection
- **Multi-Region Support**: Select one or more AWS regions to scan
- **CloudFormation Integration**: Link to deploy the required IAM role
- **Responsive Design**: Works on desktop and mobile devices

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

## Configuration

Create a `.env` file with:

```env
VITE_API_URL=https://your-api-gateway-url
```

## Deployment

```bash
# Build and deploy to S3
make customer-portal-build
make deploy-customer-portal
```

The customer portal is automatically deployed to S3 and served via CloudFront (when infrastructure is uncommented in `infra/customers.tf`).

## Customer Flow

1. Customer deploys CloudFormation stack (`cfn/customer-onboarding-role.yaml`) in their AWS account
2. Customer copies the Role ARN from CloudFormation outputs
3. Customer visits the registration portal
4. Customer fills in:
   - **Tenant ID**: Unique identifier (e.g., `acme-corp`)
   - **Customer Name**: Display name (e.g., `ACME Corporation`)
   - **Role ARN**: From CloudFormation output
   - **Account ID**: 12-digit AWS account ID
   - **Regions**: AWS regions to scan
5. System validates input and stores customer record in DynamoDB
6. Admin can now select this customer in the Admin Portal

## API Integration

The portal calls:
- `POST /register` - Register new customer

See `src/api.ts` for API client implementation.
