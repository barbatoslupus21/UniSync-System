from .models import UserOnlineStatus

class UserOnlineStatusMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Process the request
        response = self.get_response(request)

        # Update user online status after the response is generated
        if request.user.is_authenticated:
            # Update or create the user's online status
            UserOnlineStatus.objects.update_or_create(
                user=request.user,
                defaults={'is_online': True}
            )

        return response
