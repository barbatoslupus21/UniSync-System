# Document Notification Email System

This system automatically sends email notifications for documents that are approaching their due dates. The system sends notifications at three intervals:

- **2 days before due date** - Reminder notification
- **1 day before due date** - Urgent reminder notification  
- **On due date** - Critical notification

## Features

- **Automatic Daily Execution**: The system runs automatically every day at 8:00 AM
- **HTML Email Templates**: Professional, responsive email templates with document details
- **Recipient Management**: Uses NotificationRecipient settings to determine who receives emails
- **Logging**: Comprehensive logging of all email activities
- **Management Commands**: Easy-to-use commands for testing and manual execution
- **Error Handling**: Robust error handling with retry capabilities

## Configuration

### Email Settings
The system uses the following email configuration in `settings.py`:

```python
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'mis.repco.it@gmail.com'
EMAIL_HOST_PASSWORD = 'piqghkngsohhzclg'
DEFAULT_FROM_EMAIL = 'mis.repco.it@gmail.com'
```

### Automatic Scheduling
The scheduler starts automatically when Django starts and runs daily at 8:00 AM. This can be configured in `docunotification/apps.py`:

```python
# Change the time here (24-hour format)
start_notification_scheduler(run_time_hour=8, run_time_minute=0)
```

## Usage

### Manual Testing
To test the system without sending actual emails:
```bash
python manage.py send_document_notifications --dry-run --verbose
```

### Send Notifications for Specific Days
```bash
# Send notifications for documents due in 2 days
python manage.py send_document_notifications --days 2

# Send notifications for documents due tomorrow
python manage.py send_document_notifications --days 1

# Send notifications for documents due today
python manage.py send_document_notifications --days 0
```

### Send All Notifications
```bash
python manage.py send_document_notifications --verbose
```

### Manage the Scheduler
```bash
# Check scheduler status
python manage.py manage_notification_scheduler status

# Start the scheduler manually
python manage.py manage_notification_scheduler start --hour 8 --minute 0

# Stop the scheduler
python manage.py manage_notification_scheduler stop

# Trigger notifications immediately
python manage.py manage_notification_scheduler trigger
```

## How It Works

1. **Document Model**: Documents have `due_date` and `notification_period` fields
2. **Recipients**: The `NotificationRecipient` model defines who should receive notifications
3. **Email Service**: The `DocumentNotificationEmailService` handles all email logic
4. **Scheduler**: Runs automatically in the background to send daily notifications
5. **History**: All notifications are logged in `NotificationHistory` for tracking

## Email Template

The system uses a professional HTML email template that includes:
- Document reference number and title
- Category and status information
- Due date with urgency indicators
- Description and creator information
- Responsive design for mobile devices

## Logging

All email activities are logged to:
- `logs/email_notifications.log` - Email-specific logs
- `logs/django.log` - General Django logs

## Database Changes

The system uses existing models but adds these tracking fields to `DocumentNotification`:
- `last_notification_sent` - When the last notification was sent
- `notification_count` - How many notifications have been sent

## Security Notes

- Email credentials are stored in settings.py (consider using environment variables in production)
- The system only sends to users with `notify_via_email=True` in their NotificationRecipient settings
- All email sending is logged for audit purposes

## Troubleshooting

### Common Issues

1. **Emails not sending**: Check email credentials and SMTP settings
2. **Scheduler not running**: Restart Django application
3. **No recipients found**: Check NotificationRecipient table for the document
4. **Wrong time zone**: Check `TIME_ZONE` setting in Django settings

### Debugging

Use the dry-run mode to test without sending emails:
```bash
python manage.py send_document_notifications --dry-run --verbose
```

Check logs for detailed information:
```bash
tail -f logs/email_notifications.log
```