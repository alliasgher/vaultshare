"""
URL patterns for files app
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FileUploadViewSet, FileAccessViewSet

router = DefaultRouter()
router.register(r'files', FileUploadViewSet, basename='file')
router.register(r'access', FileAccessViewSet, basename='access')

urlpatterns = [
    path('', include(router.urls)),
]
