document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const placeholder = document.getElementById('placeholder');
    const magnifier = document.getElementById('magnifier');
    
    const colorSwatch = document.getElementById('color-swatch');
    const hexInput = document.getElementById('hex-value');
    const rgbInput = document.getElementById('rgb-value');
    const copyButtons = document.querySelectorAll('.btn-copy');
    const removeBtn = document.getElementById('btn-remove');

    let image = new Image();
    let isImageLoaded = false;

    // Remove Image Logic
    removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetApp();
    });

    function resetApp() {
        isLocked = false;
        isImageLoaded = false;
        image = new Image();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        placeholder.style.display = 'flex';
        removeBtn.style.display = 'none';
        fileInput.value = '';
        updateUI('#FFFFFF', 'rgb(255, 255, 255)');
        magnifier.style.display = 'none';
    }

    // Event Listeners for Drag & Drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    // File Input Change
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    function handleImageUpload(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            image.src = e.target.result;
            image.onload = () => {
                isImageLoaded = true;
                placeholder.style.display = 'none';
                canvas.style.display = 'block';
                removeBtn.style.display = 'flex';
                resizeCanvas();
                drawImage();
            };
        };
        reader.readAsDataURL(file);
    }

    function resizeCanvas() {
        if (!isImageLoaded) return;
        
        const container = dropZone.getBoundingClientRect();
        const aspectRatio = image.width / image.height;
        
        let newWidth = container.width;
        let newHeight = newWidth / aspectRatio;

        if (newHeight > container.height) {
            newHeight = container.height;
            newWidth = newHeight * aspectRatio;
        }

        canvas.width = newWidth;
        canvas.height = newHeight;
        drawImage();
    }

    function drawImage() {
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', () => {
        if (isImageLoaded) {
            resizeCanvas();
        }
    });

    // Touch Events for Mobile
    canvas.addEventListener('touchstart', (e) => {
        if (!isImageLoaded) return;
        e.preventDefault(); // Prevent scrolling
        const touch = e.touches[0];
        // Create a mock event object for pickColor
        const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY
        };
        
        // On mobile, we might want to just show the magnifier first, then lock on tap?
        // Or just follow the same logic: touch move = preview, tap = lock.
        // But 'touchstart' is like mousedown. 
        
        // Let's treat touchmove as hovering, and a quick tap as a click.
        // For now, let's just make sure dragging updates the color.
        
        if (!isLocked) {
            pickColor(mockEvent);
            updateMagnifier(mockEvent);
        }
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!isImageLoaded) return;
        e.preventDefault();
        const touch = e.touches[0];
        const mockEvent = {
            clientX: touch.clientX,
            clientY: touch.clientY
        };
        
        if (!isLocked) {
            pickColor(mockEvent);
            updateMagnifier(mockEvent);
        }
    }, { passive: false });

    // Handle Tap to Lock
    // We can use the existing click listener, but mobile browsers have a delay or might not fire it if we preventDefault on touchstart.
    // Let's add a specific touchend handler for locking if needed, or rely on click if we didn't drag much.
    // Actually, since we preventDefault on touchstart/move, click might not fire.
    // Let's implement a simple tap detector.
    
    let touchStartTime = 0;
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartTime = Date.now();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!isImageLoaded) return;
        const touchDuration = Date.now() - touchStartTime;
        
        // If it was a short tap (less than 200ms), treat as click/lock toggle
        if (touchDuration < 200) {
             if (isLocked) {
                isLocked = false;
                magnifier.style.display = 'none'; // Hide magnifier on unlock
            } else {
                isLocked = true;
                showToast('Color locked!');
            }
        } else {
            // If it was a drag and we lift finger, if not locked, hide magnifier
            if (!isLocked) {
                magnifier.style.display = 'none';
            }
        }
    });

    let isLocked = false;

    // Color Picking Logic
    canvas.addEventListener('mousemove', (e) => {
        if (!isImageLoaded) return;
        if (!isLocked) {
            pickColor(e);
        }
        updateMagnifier(e);
    });

    canvas.addEventListener('mouseleave', () => {
        if (!isLocked) {
            magnifier.style.display = 'none';
        }
    });

    canvas.addEventListener('click', (e) => {
        if (!isImageLoaded) return;
        
        if (isLocked) {
            // If already locked, unlock it to allow previewing again
            isLocked = false;
            // Optional: visual feedback for unlock
        } else {
            // Lock the color
            isLocked = true;
            const colorData = pickColor(e);
            copyToClipboard(colorData.hex);
            showToast('Color locked & copied!');
        }
    });

    function pickColor(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        // Get pixel data
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        const r = pixel[0];
        const g = pixel[1];
        const b = pixel[2];

        const hex = rgbToHex(r, g, b);
        const rgb = `rgb(${r}, ${g}, ${b})`;

        updateUI(hex, rgb);
        return { hex, rgb, x, y };
    }

    function updateMagnifier(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        magnifier.style.display = 'block';
        magnifier.style.left = `${e.clientX - rect.left - 50}px`;
        magnifier.style.top = `${e.clientY - rect.top - 50}px`;
        
        // Zoom effect logic could go here, but for now simple cursor follower
        // To do a real magnifier, we'd need another canvas or complex background positioning
        // For simplicity in this version, let's just show the color in the magnifier border
        
        const pixel = ctx.getImageData(x, y, 1, 1).data;
        magnifier.style.borderColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
        magnifier.style.backgroundColor = `rgb(${pixel[0]}, ${pixel[1]}, ${pixel[2]})`;
    }

    function updateUI(hex, rgb) {
        colorSwatch.style.backgroundColor = hex;
        hexInput.value = hex;
        rgbInput.value = rgb;
    }

    function rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
    }

    // Copy Functionality
    copyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            copyToClipboard(input.value);
            
            // Visual feedback
            const originalIcon = btn.innerHTML;
            btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
            setTimeout(() => {
                btn.innerHTML = originalIcon;
            }, 1500);
        });
    });

    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy: ', err);
        });
    }

    function showToast(message) {
        // Simple toast implementation could be added here
        console.log(message);
    }
});

