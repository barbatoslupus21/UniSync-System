from django.db import models

class Line(models.Model):
    line_name = models.CharField(max_length=100)
    def __str__(self):
        return self.line_name
