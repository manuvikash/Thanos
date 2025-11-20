"""
Lambda handler for resource group management.
"""
import json
import os
import uuid
from typing import Dict, Any, List
import boto3
from botocore.exceptions import ClientError
from datetime import datetime

# Add parent directory to path for imports
import sys
sys.path.insert(0, '/opt/python')
sys.path.insert(0, '/var/task')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'common'))

from common.logging import get_logger
from common.config_models import ResourceGroup

logger = get_logger(__name__)

# Initialize DynamoDB
dynamodb = boto3.resource('dynamodb')
resource_groups_table_name = os.environ.get('RESOURCE_GROUPS_TABLE', 'cloud-golden-guard-dev-resource-groups')
resource_groups_table = dynamodb.Table(resource_groups_table_name)


def get_cors_headers() -> Dict[str, str]:
    """Get CORS headers for responses."""
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,x-api-key',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
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
    Handle resource group API requests.
    
    Routes:
        GET /groups                  - List all groups
        GET /groups/{group_id}       - Get group details
        POST /groups                 - Create group
        PATCH /groups/{group_id}     - Update group
        DELETE /groups/{group_id}    - Delete group
    """
    try:
        http_method = event.get('requestContext', {}).get('http', {}).get('method')
        path = event.get('rawPath', '')
        path_params = event.get('pathParameters', {})
        
        logger.info(f"Processing {http_method} {path}")
        
        if http_method == 'GET':
            if path_params and 'group_id' in path_params:
                return get_group(path_params['group_id'])
            else:
                return list_groups()
        
        elif http_method == 'POST':
            body = json.loads(event.get('body', '{}'))
            return create_group(body)
        
        elif http_method in ['PATCH', 'PUT']:
            if path_params and 'group_id' in path_params:
                body = json.loads(event.get('body', '{}'))
                return update_group(path_params['group_id'], body)
        
        elif http_method == 'DELETE':
            if path_params and 'group_id' in path_params:
                return delete_group(path_params['group_id'])
        
        return response(400, {'error': 'Invalid request'})
    
    except Exception as e:
        logger.error(f"Error processing request: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def list_groups(resource_type: str = None) -> Dict[str, Any]:
    """List all resource groups, optionally filtered by resource type."""
    try:
        if resource_type:
            # Query by resource type using GSI1
            response = resource_groups_table.query(
                IndexName='GSI1',
                KeyConditionExpression='#gsi1pk = :rt',
                ExpressionAttributeNames={'#gsi1pk': 'GSI1PK'},
                ExpressionAttributeValues={':rt': resource_type}
            )
        else:
            # Scan for all groups
            response = resource_groups_table.scan(
                FilterExpression='begins_with(PK, :prefix)',
                ExpressionAttributeValues={':prefix': 'GROUP#'}
            )
        
        groups = []
        for item in response.get('Items', []):
            try:
                group = ResourceGroup.from_dynamodb(item)
                groups.append({
                    'group_id': group.group_id,
                    'name': group.name,
                    'resource_type': group.resource_type,
                    'selector': group.selector,
                    'priority': group.priority,
                    'description': group.description,
                    'desired_config': group.desired_config,
                    'created_at': group.created_at,
                    'updated_at': group.updated_at,
                    'created_by': group.created_by
                })
            except Exception as e:
                logger.warning(f"Error parsing group: {e}")
        
        # Sort by priority (higher priority first)
        groups.sort(key=lambda x: x['priority'], reverse=True)
        
        return response(200, {'groups': groups})
    
    except Exception as e:
        logger.error(f"Error listing groups: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def get_group(group_id: str) -> Dict[str, Any]:
    """Get a specific resource group."""
    try:
        response = resource_groups_table.get_item(
            Key={
                'PK': f'GROUP#{group_id}',
                'SK': 'METADATA'
            }
        )
        
        item = response.get('Item')
        if not item:
            return response(404, {'error': 'Group not found'})
        
        group = ResourceGroup.from_dynamodb(item)
        
        return response(200, {
            'group_id': group.group_id,
            'name': group.name,
            'resource_type': group.resource_type,
            'selector': group.selector,
            'priority': group.priority,
            'description': group.description,
            'desired_config': group.desired_config,
            'created_at': group.created_at,
            'updated_at': group.updated_at,
            'created_by': group.created_by
        })
    
    except Exception as e:
        logger.error(f"Error getting group: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def create_group(data: Dict[str, Any]) -> Dict[str, Any]:
    """Create a new resource group."""
    try:
        # Validate required fields
        required_fields = ['name', 'resource_type', 'selector']
        for field in required_fields:
            if field not in data:
                return response(400, {'error': f'{field} is required'})
        
        # Generate group ID
        group_id = str(uuid.uuid4())
        
        # Create group object
        group = ResourceGroup(
            group_id=group_id,
            name=data['name'],
            resource_type=data['resource_type'],
            selector=data['selector'],
            priority=data.get('priority', 100),
            description=data.get('description', ''),
            desired_config=data.get('desired_config', {}),
            created_by=data.get('created_by', 'user')
        )
        
        # Save to DynamoDB
        resource_groups_table.put_item(Item=group.to_dynamodb())
        
        logger.info(f"Created group {group_id}: {data['name']}")
        
        return response(201, {
            'message': 'Group created successfully',
            'group_id': group_id,
            'name': data['name']
        })
    
    except Exception as e:
        logger.error(f"Error creating group: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def update_group(group_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    """Update an existing resource group."""
    try:
        # Get existing group
        response = resource_groups_table.get_item(
            Key={
                'PK': f'GROUP#{group_id}',
                'SK': 'METADATA'
            }
        )
        
        item = response.get('Item')
        if not item:
            return response(404, {'error': 'Group not found'})
        
        # Update fields
        update_expr_parts = []
        expr_attr_values = {}
        expr_attr_names = {}
        
        # Always update updated_at
        update_expr_parts.append('#updated_at = :updated_at')
        expr_attr_names['#updated_at'] = 'updated_at'
        expr_attr_values[':updated_at'] = datetime.utcnow().isoformat()
        
        # Update other fields if provided
        updatable_fields = {
            'name': 'name',
            'description': 'description',
            'selector': 'selector',
            'priority': 'priority',
            'desired_config': 'desired_config'
        }
        
        for data_key, db_key in updatable_fields.items():
            if data_key in data:
                placeholder = f'#{db_key}'
                value_placeholder = f':{db_key}'
                update_expr_parts.append(f'{placeholder} = {value_placeholder}')
                expr_attr_names[placeholder] = db_key
                expr_attr_values[value_placeholder] = data[data_key]
                
                # Update GSI fields if needed
                if db_key == 'priority':
                    update_expr_parts.append('#gsi1sk = :gsi1sk')
                    expr_attr_names['#gsi1sk'] = 'GSI1SK'
                    expr_attr_values[':gsi1sk'] = str(data[data_key])
        
        if len(update_expr_parts) == 1:  # Only updated_at
            return response(400, {'error': 'No fields to update'})
        
        update_expression = 'SET ' + ', '.join(update_expr_parts)
        
        # Perform update
        resource_groups_table.update_item(
            Key={
                'PK': f'GROUP#{group_id}',
                'SK': 'METADATA'
            },
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expr_attr_names,
            ExpressionAttributeValues=expr_attr_values
        )
        
        logger.info(f"Updated group {group_id}")
        
        return response(200, {
            'message': 'Group updated successfully',
            'group_id': group_id
        })
    
    except Exception as e:
        logger.error(f"Error updating group: {e}", exc_info=True)
        return response(500, {'error': str(e)})


def delete_group(group_id: str) -> Dict[str, Any]:
    """Delete a resource group."""
    try:
        # Check if group exists
        response = resource_groups_table.get_item(
            Key={
                'PK': f'GROUP#{group_id}',
                'SK': 'METADATA'
            }
        )
        
        if 'Item' not in response:
            return response(404, {'error': 'Group not found'})
        
        # Delete the group
        resource_groups_table.delete_item(
            Key={
                'PK': f'GROUP#{group_id}',
                'SK': 'METADATA'
            }
        )
        
        logger.info(f"Deleted group {group_id}")
        
        return response(200, {
            'message': 'Group deleted successfully',
            'group_id': group_id
        })
    
    except Exception as e:
        logger.error(f"Error deleting group: {e}", exc_info=True)
        return response(500, {'error': str(e)})
