# Realistic Solar System Simulation - WebGL

An interactive 3D solar system visualization using WebGL with scientifically accurate orbital mechanics, realistic textures, and advanced rendering effects.

## Educational Institution

**Arab American University - Ramallah Campus**  
**Instructor:** Dr. Eman Naser

## Developers

- **Omar Jaber**
- **Yazan Aydi**
- **Mohammad Munir**

## Features

### Realistic Physics
- **Elliptical Orbits** - Based on Kepler's 1st Law with real eccentricity values
- **Variable Orbital Speeds** - Kepler's 2nd Law (planets speed up near Sun, slow down far away)
- **Counter-clockwise Prograde Motion** - All planets orbit in the same direction
- **Natural Satellites** - 14 moons orbiting their parent planets
- **Planetary Ring Systems** - Saturn, Jupiter, Uranus, and Neptune
- **Galactic Motion** - Entire solar system moving through space at 828,000 km/h
- **3D Helical Trajectories** - Spiral orbital paths through space

### Advanced Graphics
- **High-Quality Textures** - 2K resolution NASA textures for all planets
- **Dynamic Earth** - Day/night cycle with city lights and cloud layers
- **Bloom Post-Processing** - Realistic glow effects around the Sun
- **Atmospheric Rim Lighting** - Subtle glow around planet edges
- **Textured Rings** - Saturn's spectacular rings with alpha transparency
- **Milky Way Skybox** - Beautiful galactic background
- **Procedural Stars** - 3000+ additional stars for depth

### Interactive Controls
- **Mouse Drag** - Rotate camera view
- **Mouse Scroll** - Zoom in/out
- **Arrow Keys** - Pan camera left/right/up/down
- **W/S Keys** - Zoom in/out
- **A/D Keys** - Rotate camera left/right
- **Q/E Keys** - Move camera up/down
- **R Key** - Reset camera to default position
- **Speed Slider** - Control animation speed (0x to 3x)

## How to Run

### IMPORTANT: You must run a local web server to view textures!

Opening the HTML file directly (double-clicking) will cause CORS errors. Use one of these methods:

### Method 1: Using Python (Recommended - Easiest)

**Option A - Double-click the batch file:**
```bash
start-server.bat
```

**Option B - Manual command:**
```bash
# If you have Python 3:
python -m http.server 8000

# If you have Python 2:
python -m SimpleHTTPServer 8000
```

Then open your browser to: **http://localhost:8000/solar-system.html**

### Method 2: Using Node.js

```bash
# Install http-server globally (one time)
npm install -g http-server

# Run server
http-server -p 8000
```

Then open: **http://localhost:8000/solar-system.html**

### Method 3: Using VS Code Live Server Extension

1. Install "Live Server" extension in VS Code
2. Right-click on `solar-system.html`
3. Select "Open with Live Server"

## Project Structure

```
computerGraphicProject/
├── solar-system.html          # Main application
├── start-server.bat          # Quick server launcher (Windows)
├── README.md                 # This file
└── textures/                 # Planet and ring textures
    ├── 2k_sun.jpg
    ├── mercury.jpg
    ├── 2k_venus_surface.jpg
    ├── 2k_earth_daymap.jpg
    ├── 2k_earth_nightmap.jpg
    ├── 2k_earth_clouds.jpg
    ├── 2k_mars.jpg
    ├── 2k_jupiter.jpg
    ├── 2k_saturn.jpg
    ├── 2k_uranus.jpg
    ├── 2k_neptune.jpg
    ├── 2k_moon.jpg
    └── 2k_saturn_ring_alpha.png
```

## Educational Value

This simulation demonstrates:
- **Kepler's Laws of Planetary Motion**
- **Elliptical orbital mechanics**
- **3D helical motion through the galaxy**
- **Gravitational dynamics**
- **Realistic day/night cycles**
- **WebGL rendering pipeline**
- **Advanced shader programming**

## Technical Details

### Technologies Used
- **WebGL** - GPU-accelerated 3D graphics
- **GLSL Shaders** - Custom vertex and fragment shaders
- **Framebuffer Objects** - Multi-pass rendering for bloom
- **Texture Mapping** - UV coordinate-based texture application
- **Matrix Mathematics** - 4x4 transformation matrices

### Rendering Pipeline
1. Render stars to scene framebuffer
2. Render planets with textures and lighting
3. Render orbital trails
4. Extract bright areas for bloom
5. Apply Gaussian blur (horizontal + vertical passes)
6. Combine scene with bloom effect
7. Tone mapping for final output

### Planetary Data
Each planet includes:
- Semi-major axis (orbital distance)
- Eccentricity (orbital ellipse shape)
- Orbital speed
- Axial rotation speed
- High-resolution texture
- Ring system (if applicable)
- Natural satellites/moons

## Special Features

### Earth's Dynamic Day/Night System
Earth uses a sophisticated 3-texture system:
- **Day Map** - Continents and oceans illuminated by sunlight
- **Night Map** - City lights visible on the dark side
- **Cloud Layer** - Atmospheric clouds with transparency

The shader automatically blends these based on the Sun's position, creating realistic day/night transitions!

### Realistic Ring Systems
- **Saturn** - Bright, spectacular rings (70% opacity) - water ice
- **Jupiter** - Faint, dusty rings (15% opacity) - discovered by Voyager 1
- **Uranus** - Dark, perpendicular rings (25% opacity) - 90° tilt
- **Neptune** - Faint arc rings (20% opacity) - imaged by Voyager 2

## Performance

- 60 FPS on modern hardware
- 3000+ stars rendered as points
- 9 planets + 14 moons = 23 celestial bodies
- Real-time bloom post-processing
- Dynamic orbital trail visualization

## License

Copyright 2026 - All rights reserved.

Arab American University - Ramallah Campus  
Computer Graphics Course  
Instructor: Dr. Eman Naser

---

Developed by Omar Jaber, Yazan Aydi, and Mohammad Munir
