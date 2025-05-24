# Generated manually on 2025-05-15

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('portalusers', '0001_initial'),
        ('chat', '0002_message_unread'),
    ]

    operations = [
        migrations.CreateModel(
            name='UserOnlineStatus',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('is_online', models.BooleanField(default=False)),
                ('last_activity', models.DateTimeField(auto_now=True)),
                ('user', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, to='portalusers.users')),
            ],
        ),
    ]
