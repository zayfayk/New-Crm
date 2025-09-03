from django.db import models
from django.conf import settings  # settings.AUTH_USER_MODEL için import
from django.utils.timezone import now

class FieldTemplate(models.Model):
    name = models.CharField("Field Name", max_length=100)

    def __str__(self):
        return self.name

class Client(models.Model):
    creation_date = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clients')  # Özel kullanıcı modeli

    def __str__(self):
        return f"Client {self.id} (Created by: {self.created_by.username})"

class ClientField(models.Model):
    client = models.ForeignKey(Client, related_name='fields', on_delete=models.CASCADE)
    template = models.ForeignKey(FieldTemplate, on_delete=models.CASCADE)
    value = models.CharField("Field Value", max_length=255, blank=True)

    def __str__(self):
        return f"{self.template.name}: {self.value}"

class UserActivity(models.Model):
    user = models.ForeignKey('Custom_user.User', on_delete=models.CASCADE, related_name='activities')
    date = models.DateField(default=now)
    record_count = models.PositiveIntegerField(default=0)
    active_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    class Meta:
        unique_together = ('user', 'date')
        verbose_name = 'User Activity'
        verbose_name_plural = 'User Activities'

    def __str__(self):
        return f"{self.user.username} - {self.date}"