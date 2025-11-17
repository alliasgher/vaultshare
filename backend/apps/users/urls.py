"""
URL patterns for users app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
