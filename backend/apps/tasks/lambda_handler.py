"""
Lambda handler for scheduled cleanup task
This can be deployed as a separate Lambda function triggered by EventBridge
"""
import json
import os
import django

# Setup Django environment for Lambda
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.production')
django.setup()

from apps.tasks.cleanup import run_cleanup


def handler(event, context):
    """
    AWS Lambda handler for cleanup task
    
    This function can be triggered by:
    - EventBridge (CloudWatch Events) on a schedule
    - Manual invocation
    - API Gateway endpoint
    """
    try:
        result = run_cleanup()
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Cleanup completed successfully',
                'result': result
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({
                'message': 'Cleanup failed',
                'error': str(e)
            })
        }
