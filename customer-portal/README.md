# Thanos Customer Portal

A self-service registration portal for customers to register their AWS accounts with Thanos for configuration drift detection.

## Overview

The Customer Portal allows customers to register their AWS account details after deploying the CloudFormation stack. Once registered, administrators can select the customer from a dropdown in the Admin Portal to run scans.

## Development

### Prerequisites

- Node.js 18+ and npm
- Access to the Thanos API Gateway endpoint

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from the example:
```bash
cp .env.example .env
```

3. Update the `.env` file with your API Gateway URL:
```
VITE_API_URL=https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com
```

### Running Locally

```bash
npm run dev
```

The portal will be available at `http://localhost:3001`

### Building for Production

```bash
npm run build
```

The production build will be created in the `dist/` directory.

## Deployment

The Customer Portal is deployed as a static website to S3 with CloudFront distribution.

### Deploy to S3

After building, deploy to S3 using the Makefile:

```bash
make deploy-customer-portal
```

This will:
1. Build the React application
2. Sync the `dist/` folder to the S3 bucket
3. The CloudFront distribution will serve the updated content

### Get Portal URL

After Terraform deployment, get the Customer Portal URL:

```bash
cd infra
terraform output customer_portal_url
```

## Features

- **Self-Service Registration**: Customers can register their AWS accounts independently
- **Form Validation**: Client-side validation for all fields
- **Multi-Region Selection**: Checkbox-based region selection
- **CloudFormation Instructions**: Step-by-step guide for deploying the required IAM role
- **Error Handling**: User-friendly error messages for validation and API errors
- **Responsive Design**: Works on desktop and mobile devices
- **Dark Theme**: Matches the Admin Portal styling

## Registration Fields

- **Tenant ID**: Unique identifier (3-50 characters, alphanumeric and hyphens)
- **Customer Name**: Organization display name (1-100 characters)
- **Role ARN**: IAM role ARN from CloudFormation deployment
- **Account ID**: 12-digit AWS account ID
- **Regions**: One or more AWS regions to scan

## API Integration

The portal communicates with the Thanos API Gateway:

- **POST /customers/register**: Register a new customer (no authentication required)

## Security

- No API key required for registration (customers must have valid AWS credentials to deploy CloudFormation)
- Client-side validation prevents invalid data submission
- HTTPS enforced via CloudFront
- CORS configured for the Customer Portal domain

## Troubleshooting

### Build Errors

If you encounter TypeScript errors during build:
```bash
npm run lint
```

### API Connection Issues

1. Verify the `VITE_API_URL` in your `.env` file
2. Check that the API Gateway is deployed and accessible
3. Verify CORS is configured for the Customer Portal domain

### Duplicate Tenant ID

If registration fails with "Customer with this Tenant ID already exists":
- Choose a different Tenant ID
- Contact the administrator if you believe this is an error

## License

See the main Thanos repository for license information.
