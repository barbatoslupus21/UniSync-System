"""
Management command to generate a new daily passcode for the Overtime late filing system.
"""
import logging
from django.core.management.base import BaseCommand
from overtime.utils import generate_passcode
from overtime.models import OvertimePasscode

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Generate a new daily passcode for the Overtime late filing system'

    def handle(self, *args, **options):
        try:
            passcode = generate_passcode()
            OvertimePasscode.objects.filter(is_active=True).update(is_active=False)
            OvertimePasscode.objects.create(passcode=passcode, is_active=True)
            self.stdout.write(self.style.SUCCESS(f'New passcode generated successfully: {passcode}'))
            logger.info('Daily overtime passcode generated successfully.')
        except Exception as e:
            self.stderr.write(self.style.ERROR(f'Failed to generate passcode: {e}'))
            logger.error(f'Failed to generate overtime passcode: {e}')
