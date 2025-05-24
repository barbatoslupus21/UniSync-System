# overtime/signals.py
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone

from .models import Employee, EmployeeGroup, OTFiling, SystemActivity

@receiver(post_save, sender=Employee)
def update_shuttle_allocations(sender, instance, created, **kwargs):
    if created:
        from .utils import create_system_activity
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            admin_user = User.objects.filter(is_admin=True).first()
            
            if admin_user:
                create_system_activity(
                    admin_user,
                    'OTHER',
                    f"System automatically logged: New employee created - {instance.id_number} - {instance.name}"
                )
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error creating system activity log: {str(e)}")

@receiver(post_save, sender=OTFiling)
def update_ot_statistics(sender, instance, created, **kwargs):
    pass