# Generated manually on 2025-05-15

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('chat', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='message',
            name='unread',
            field=models.BooleanField(default=True),
        ),
    ]
