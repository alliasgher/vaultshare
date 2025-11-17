"""
Core utility functions
"""
import hashlib
import secrets
import string


def generate_secure_token(length=32):
    """Generate a cryptographically secure random token"""
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_file_hash(file_obj):
    """Generate SHA256 hash of a file"""
    sha256_hash = hashlib.sha256()
    
    # Read file in chunks to handle large files
    for chunk in file_obj.chunks():
        sha256_hash.update(chunk)
    
    return sha256_hash.hexdigest()


def format_file_size(size_bytes):
    """Format file size in human-readable format"""
    for unit in ['B', 'KB', 'MB', 'GB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} TB"
