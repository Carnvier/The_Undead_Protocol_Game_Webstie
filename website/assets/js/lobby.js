// Lobby page interactive effects

// Add fade-in animation on page load
document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    main.style.opacity = '0';
    main.style.transition = 'opacity 1s ease-in';

    setTimeout(() => {
        main.style.opacity = '1';
    }, 100);

    // Add hover sound effect to game options
    const gameLinks = document.querySelectorAll('section ul li a');
    gameLinks.forEach(link => {
        link.addEventListener('mouseenter', () => {
            // Add scale pulse effect
            link.style.transform = 'scale(1.05)';
        });

        link.addEventListener('mouseleave', () => {
            link.style.transform = 'scale(1)';
        });
    });

    // Display username from session
    const username = sessionStorage.getItem('username');
    if (username) {
        const welcomeText = document.querySelector('main h2');
        welcomeText.textContent = `Welcome, ${username}`;
    }

    // Add particle effect to background
    createParticles();
});

// Create floating blood particle effect
function createParticles() {
    const particleCount = 30;
    const container = document.body;

    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';

        // Random size for variety
        const size = Math.random() * 4 + 2;
        const duration = 5 + Math.random() * 10;
        const delay = Math.random() * 5;

        particle.style.cssText = `
            position: fixed;
            width: ${size}px;
            height: ${size}px;
            background: radial-gradient(circle, rgba(255, 0, 0, 0.8), rgba(139, 0, 0, 0.4));
            border-radius: 50%;
            pointer-events: none;
            z-index: 0;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
            animation: float ${duration}s infinite ease-in-out ${delay}s, pulse 2s infinite;
            box-shadow: 0 0 10px rgba(255, 0, 0, 0.5);
        `;
        container.appendChild(particle);
    }

    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
        @keyframes float {
            0%, 100% {
                transform: translate(0, 0) rotate(0deg);
                opacity: 0;
            }
            25% {
                opacity: 0.8;
            }
            50% {
                transform: translate(${Math.random() * 200 - 100}px, ${Math.random() * 200 - 100}px) rotate(180deg);
                opacity: 1;
            }
            75% {
                opacity: 0.8;
            }
        }

        @keyframes pulse {
            0%, 100% {
                transform: scale(1);
            }
            50% {
                transform: scale(1.5);
            }
        }
    `;
    document.head.appendChild(style);
}
