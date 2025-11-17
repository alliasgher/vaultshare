"""
Django management command for running cleanup tasks
Usage: python manage.py cleanup_files
"""
from django.core.management.base import BaseCommand
from apps.tasks.cleanup import run_cleanup


class Command(BaseCommand):
    help = 'Clean up expired files and send expiry notifications'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting cleanup...'))
        
        result = run_cleanup()
        
        self.stdout.write(self.style.SUCCESS(
            f"Cleanup completed:\n"
            f"  Files processed: {result['cleanup']['total_processed']}\n"
            f"  Deleted from DB: {result['cleanup']['deleted_from_db']}\n"
            f"  Deleted from S3: {result['cleanup']['deleted_from_s3']}\n"
            f"  Storage freed: {result['cleanup']['storage_freed']} bytes\n"
            f"  Failed: {result['cleanup']['failed']}\n"
            f"  Notifications sent: {result['notifications_sent']}"
        ))
