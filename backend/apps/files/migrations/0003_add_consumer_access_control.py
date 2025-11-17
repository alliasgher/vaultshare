# Generated manually

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('files', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='fileupload',
            name='require_signin',
            field=models.BooleanField(default=False, help_text='Require consumers to sign in before accessing this file'),
        ),
        migrations.AddField(
            model_name='fileupload',
            name='max_views_per_consumer',
            field=models.IntegerField(default=0, help_text='Maximum views allowed per consumer (0 = unlimited per consumer)'),
        ),
        migrations.AddField(
            model_name='accesslog',
            name='consumer',
            field=models.ForeignKey(blank=True, help_text='Consumer who accessed the file (if signed in)', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='access_logs', to=settings.AUTH_USER_MODEL),
        ),
    ]
