# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('files', '0003_add_consumer_access_control'),
    ]

    operations = [
        migrations.AddField(
            model_name='fileupload',
            name='session_duration',
            field=models.IntegerField(default=15, help_text="Duration in minutes for a single view session (refreshes within this time don't count as new views)"),
        ),
    ]
