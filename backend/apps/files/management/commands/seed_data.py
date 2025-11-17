"""
Django management command to seed database with sample data
Usage: python manage.py seed_data
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.files.models import FileUpload, AccessLog
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed database with sample data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--users',
            type=int,
            default=3,
            help='Number of users to create'
        )
        parser.add_argument(
            '--files',
            type=int,
            default=5,
            help='Number of files per user to create'
        )

    def handle(self, *args, **options):
        num_users = options['users']
        num_files = options['files']

        self.stdout.write(self.style.SUCCESS('Starting data seeding...'))

        # Create users
        users = []
        for i in range(num_users):
            email = f'user{i+1}@vaultshare.test'
            username = f'user{i+1}'
            
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': username,
                    'is_email_verified': True,
                }
            )
            
            if created:
                user.set_password('password123')
                user.save()
                self.stdout.write(f'Created user: {email}')
            else:
                self.stdout.write(f'User exists: {email}')
            
            users.append(user)

        # Create sample file uploads
        sample_files = [
            ('document.pdf', 'application/pdf', 1024 * 100),  # 100 KB
            ('presentation.pptx', 'application/vnd.ms-powerpoint', 1024 * 500),  # 500 KB
            ('spreadsheet.xlsx', 'application/vnd.ms-excel', 1024 * 200),  # 200 KB
            ('image.jpg', 'image/jpeg', 1024 * 300),  # 300 KB
            ('archive.zip', 'application/zip', 1024 * 1024),  # 1 MB
        ]

        for user in users:
            for i in range(num_files):
                filename, content_type, file_size = random.choice(sample_files)
                
                # Create file upload (without actual S3 upload for demo)
                file_upload = FileUpload.objects.create(
                    user=user,
                    filename=f'sample_{i+1}_{filename}',
                    original_filename=filename,
                    file_size=file_size,
                    file_hash=f'hash_{random.randint(1000, 9999)}',
                    content_type=content_type,
                    s3_key=f'demo/user_{user.id}/{i+1}/{filename}',
                    s3_bucket='vaultshare-demo',
                    expiry_hours=random.choice([6, 12, 24, 48, 72]),
                    max_views=random.choice([3, 5, 10, 20]),
                    disable_download=random.choice([True, False]),
                    current_views=random.randint(0, 2),
                )
                
                # Update user storage
                user.storage_used += file_size
                
                # Create some access logs
                for _ in range(random.randint(0, 3)):
                    AccessLog.objects.create(
                        file=file_upload,
                        ip_address=f'{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}',
                        user_agent='Mozilla/5.0 (Sample User Agent)',
                        access_granted=random.choice([True, False]),
                        access_method=random.choice(['view', 'download']),
                        failure_reason=random.choice(['', 'expired', 'wrong_password']) if not random.choice([True, False]) else '',
                    )
                
                self.stdout.write(f'Created file: {filename} for {user.email}')
            
            user.save()

        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Seeding complete!\n'
            f'Created {num_users} users with {num_files} files each\n'
            f'Login credentials:\n'
            f'  Email: user1@vaultshare.test\n'
            f'  Password: password123\n'
        ))
