"""
Development settings for VaultShare
"""

from .base import *
import dj_database_url

DEBUG = True

ALLOWED_HOSTS = ['*']

# Database - Use DATABASE_URL if set (for testing Neon), otherwise SQLite
DATABASE_URL_ENV = os.getenv('DATABASE_URL')
if DATABASE_URL_ENV and DATABASE_URL_ENV.startswith('postgresql'):
    # Use PostgreSQL (Neon) if DATABASE_URL is set
    DATABASES = {
        'default': dj_database_url.parse(DATABASE_URL_ENV)
    }
    print("✅ Using PostgreSQL (Neon) database")
else:
    # Default to SQLite for local development
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR.parent / 'db.sqlite3',
        }
    }
    print("✅ Using SQLite database")

# Disable Redis/Caching for local development
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

# Use console email backend (prints to terminal, no external service needed)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# File storage - local filesystem (no S3 needed)
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
MEDIA_ROOT = BASE_DIR.parent / 'media'
MEDIA_URL = '/media/'

# CORS settings for development
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True

# Add browsable API renderer for development
REST_FRAMEWORK['DEFAULT_RENDERER_CLASSES'] = [
    'rest_framework.renderers.JSONRenderer',
    'rest_framework.renderers.BrowsableAPIRenderer',
]

# Logging
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps': {
            'handlers': ['console'],
            'level': 'DEBUG',
            'propagate': False,
        },
    },
}
