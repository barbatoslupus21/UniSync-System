from django.db import models
from portalusers.models import Users

class Notification(models.Model):
    sender = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="sent_notifications")
    recipient = models.ForeignKey(Users, on_delete=models.CASCADE, related_name="received_notifications")
    title = models.CharField(max_length=255)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} - {self.recipient}"

    def mark_as_read(self):
        self.is_read = True
        self.save()
