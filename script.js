document.addEventListener('DOMContentLoaded', function() {
    let canvas, ctx, link;
    let x = 32, y = 32, dx = .2, dy = .2, radius = 18;

    function createFavicon() {
        // Create a canvas element
        canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        ctx = canvas.getContext('2d');

        // Create a link element for the favicon
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);

        // Start the animation
        requestAnimationFrame(draw);
    }

    function draw() {
        // Clear the canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw the ball
        ctx.fillStyle = '#ff0000'; // Red color
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        ctx.fill();

        // Update the position
        x += dx;
        y += dy;

        // Bounce off the walls
        if (x + radius > canvas.width || x - radius < 0) dx = -dx;
        if (y + radius > canvas.height || y - radius < 0) dy = -dy;

        // Update the favicon
        link.href = canvas.toDataURL('image/png');

        // Request the next frame
        requestAnimationFrame(draw);
    }

    createFavicon();
});
