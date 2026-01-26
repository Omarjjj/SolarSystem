async function initSolarSystem() {
// ===== WebGL Initialization =====
// Grab the canvas, create a WebGL context, and fail fast if unavailable.
        const canvas = document.getElementById('glCanvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) {
            alert('WebGL not supported!');
            return;
        }

        const ext = gl.getExtension('OES_texture_float');
        
        // ===== Speed Control =====
        // UI slider updates a simulation speed multiplier used in the render loop.
        let speedMultiplier = 1.0;
        const speedSlider = document.getElementById('speedSlider');
        const speedValue = document.getElementById('speedValue');
        const speedOfLightValue = document.getElementById('speedOfLightValue');
        const SPEED_OF_LIGHT_KM_S = 299792;
        const formatNumber = (value) => Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const updateSpeedDisplay = () => {
            speedValue.textContent = speedMultiplier.toFixed(1) + 'x';
            if (speedOfLightValue) {
                const speedKmPerSec = speedMultiplier * SPEED_OF_LIGHT_KM_S;
                speedOfLightValue.textContent = '(' + formatNumber(speedKmPerSec) + ' km/s)';
            }
        };
        
        speedSlider.addEventListener('input', (e) => {
            speedMultiplier = e.target.value / 100;
            updateSpeedDisplay();
        });
        updateSpeedDisplay();
        
        // ===== HUD Toggle System =====
        // Button handlers show/hide HUD panels without destroying them.
        const infoPanel = document.getElementById('info');
        const controlsPanel = document.getElementById('controls');
        const copyrightPanel = document.getElementById('copyright');
        
        const toggleInfoBtn = document.getElementById('toggleInfo');
        const toggleControlsBtn = document.getElementById('toggleControls');
        const toggleCopyrightBtn = document.getElementById('toggleCopyright');
        const hudToggleBtn = document.getElementById('hudToggle');
        
        // Individual panel toggles
        toggleInfoBtn.addEventListener('click', () => {
            infoPanel.classList.toggle('hidden');
        });
        
        toggleControlsBtn.addEventListener('click', () => {
            controlsPanel.classList.toggle('hidden');
        });
        
        toggleCopyrightBtn.addEventListener('click', () => {
            copyrightPanel.classList.toggle('hidden');
        });
        
        // Master HUD toggle - hides everything
        let hudVisible = true;
        hudToggleBtn.addEventListener('click', () => {
            hudVisible = !hudVisible;
            if (hudVisible) {
                infoPanel.classList.remove('hidden');
                controlsPanel.classList.remove('hidden');
                copyrightPanel.classList.remove('hidden');
                toggleInfoBtn.classList.remove('hidden');
                toggleControlsBtn.classList.remove('hidden');
                toggleCopyrightBtn.classList.remove('hidden');
                hudToggleBtn.textContent = 'HUD';
                hudToggleBtn.style.background = 'linear-gradient(135deg, rgba(255, 0, 100, 0.3), rgba(200, 0, 255, 0.3))';
            } else {
                infoPanel.classList.add('hidden');
                controlsPanel.classList.add('hidden');
                copyrightPanel.classList.add('hidden');
                toggleInfoBtn.classList.add('hidden');
                toggleControlsBtn.classList.add('hidden');
                toggleCopyrightBtn.classList.add('hidden');
                hudToggleBtn.textContent = 'SHOW';
                hudToggleBtn.style.background = 'linear-gradient(135deg, rgba(0, 255, 100, 0.3), rgba(0, 200, 255, 0.3))';
            }
        });
        
        // Keyboard shortcut for HUD toggle (H key)
        window.addEventListener('keydown', (e) => {
            if (e.key.toLowerCase() === 'h') {
                hudToggleBtn.click();
            }
        });
        
        // ===== Planet Tracking System =====
        // Dropdown + keyboard shortcuts set a target body for camera tracking.
        const planetSelect = document.getElementById('planetSelect');
        const trackingStatus = document.getElementById('trackingStatus');
        
        // Planet-specific camera distances (based on planet size)
        const planetCameraDistances = {
            'Sun': 25,
            'Mercury': 3,
            'Venus': 4,
            'Earth': 5,
            'Mars': 4,
            'Jupiter': 15,
            'Saturn': 14,
            'Uranus': 8,
            'Neptune': 8
        };
        
        planetSelect.addEventListener('change', () => {
            const selectedPlanet = planetSelect.value;
            
            if (selectedPlanet) {
                trackingPlanet = selectedPlanet;
                trackingStatus.textContent = 'Tracking: ' + selectedPlanet;
                trackingStatus.classList.add('tracking');
                targetCameraDistance = planetCameraDistances[selectedPlanet] || 10;
                console.log('🔭 Now tracking:', selectedPlanet);
            } else {
                trackingPlanet = null;
                trackingStatus.textContent = 'Overview Mode';
                trackingStatus.classList.remove('tracking');
                targetCameraDistance = 150;
                targetOffsetX = 0;
                targetOffsetY = 0;
                console.log('📷 Overview mode');
            }
        });
        
        // Keyboard shortcuts for planet selection
        window.addEventListener('keydown', (e) => {
            const key = e.key;
            // Number keys 1-9 for planets, 0 for overview
            if (key >= '0' && key <= '9') {
                const planetNames = ['', 'Sun', 'Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune'];
                planetSelect.value = planetNames[parseInt(key)] || '';
                planetSelect.dispatchEvent(new Event('change'));
            }
        });

        // Resize canvas
        function resizeCanvas() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            createFramebuffers();
        }

        // ===== Shader Compilation =====
        // Load GLSL source files, compile them, and link shader programs.
        async function loadText(url) {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Failed to load shader: ' + url);
            }
            return response.text();
        }

        async function loadShaders() {
            const shaderPaths = {
                planetVertex: 'shaders/planet.vert.glsl',
                planetFragment: 'shaders/planet.frag.glsl',
                skyboxVertex: 'shaders/skybox.vert.glsl',
                skyboxFragment: 'shaders/skybox.frag.glsl',
                coronaVertex: 'shaders/corona.vert.glsl',
                coronaFragment: 'shaders/corona.frag.glsl',
                starVertex: 'shaders/star.vert.glsl',
                starFragment: 'shaders/star.frag.glsl',
                bloomVertex: 'shaders/bloom.vert.glsl',
                bloomExtract: 'shaders/bloom-extract.frag.glsl',
                bloomBlur: 'shaders/bloom-blur.frag.glsl',
                bloomCombine: 'shaders/bloom-combine.frag.glsl',
                trailVertex: 'shaders/trail.vert.glsl',
                trailFragment: 'shaders/trail.frag.glsl'
            };
            const sources = {};
            for (const [key, path] of Object.entries(shaderPaths)) {
                sources[key] = await loadText(path);
            }
            return sources;
        }

        let shaders;
        try {
            shaders = await loadShaders();
        } catch (error) {
            console.error(error);
            alert('Failed to load shader files. Run a local server and try again.');
            return;
        }

        function compileShader(gl, source, type) {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error('Shader compile error:', gl.getShaderInfoLog(shader));
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        }

        function createProgram(gl, vertexSource, fragmentSource) {
            const vertexShader = compileShader(gl, vertexSource, gl.VERTEX_SHADER);
            const fragmentShader = compileShader(gl, fragmentSource, gl.FRAGMENT_SHADER);
            
            const program = gl.createProgram();
            gl.attachShader(program, vertexShader);
            gl.attachShader(program, fragmentShader);
            gl.linkProgram(program);
            
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                console.error('Program link error:', gl.getProgramInfoLog(program));
                return null;
            }
            return program;
        }

        
        // Compile all shader programs
        const program = createProgram(gl,
            shaders.planetVertex,
            shaders.planetFragment
        );

        const starProgram = createProgram(gl,
            shaders.starVertex,
            shaders.starFragment
        );

        const bloomExtractProgram = createProgram(gl,
            shaders.bloomVertex,
            shaders.bloomExtract
        );

        const bloomBlurProgram = createProgram(gl,
            shaders.bloomVertex,
            shaders.bloomBlur
        );

        const bloomCombineProgram = createProgram(gl,
            shaders.bloomVertex,
            shaders.bloomCombine
        );

        const trailProgram = createProgram(gl,
            shaders.trailVertex,
            shaders.trailFragment
        );

        const skyboxProgram = createProgram(gl,
            shaders.skyboxVertex,
            shaders.skyboxFragment
        );

        // Corona shader program for sun flames
        const coronaProgram = createProgram(gl,
            shaders.coronaVertex,
            shaders.coronaFragment
        );

        // Verify all programs compiled successfully

        if (!program || !starProgram || !bloomExtractProgram || !bloomBlurProgram || 
            !bloomCombineProgram || !trailProgram || !skyboxProgram || !coronaProgram) {
            console.error('❌ One or more shader programs failed to compile!');
            alert('Shader compilation failed! Check console for details.');
        } else {
            console.log('✅ All shader programs compiled successfully!');
        }
        
        // Get attribute and uniform locations
        const attrs = {
            position: gl.getAttribLocation(program, 'aPosition'),
            normal: gl.getAttribLocation(program, 'aNormal'),
            texCoord: gl.getAttribLocation(program, 'aTexCoord'),  
            starPosition: gl.getAttribLocation(starProgram, 'aPosition'),
            starSize: gl.getAttribLocation(starProgram, 'aSize'),
            skyboxPosition: gl.getAttribLocation(skyboxProgram, 'aPosition'),
            skyboxTexCoord: gl.getAttribLocation(skyboxProgram, 'aTexCoord')
        };
        
        const uniforms = {
            modelMatrix: gl.getUniformLocation(program, 'uModelMatrix'),
            viewMatrix: gl.getUniformLocation(program, 'uViewMatrix'),
            projectionMatrix: gl.getUniformLocation(program, 'uProjectionMatrix'),
            normalMatrix: gl.getUniformLocation(program, 'uNormalMatrix'),
            color: gl.getUniformLocation(program, 'uColor'),
            lightPosition: gl.getUniformLocation(program, 'uLightPosition'),
            isEmissive: gl.getUniformLocation(program, 'uIsEmissive'),
            cameraPosition: gl.getUniformLocation(program, 'uCameraPosition'),
            glow: gl.getUniformLocation(program, 'uGlow'),
            texture: gl.getUniformLocation(program, 'uTexture'),
            hasTexture: gl.getUniformLocation(program, 'uHasTexture'),
            isEarth: gl.getUniformLocation(program, 'uIsEarth'),
            earthDay: gl.getUniformLocation(program, 'uEarthDay'),
            earthNight: gl.getUniformLocation(program, 'uEarthNight'),
            earthClouds: gl.getUniformLocation(program, 'uEarthClouds'),
            isRing: gl.getUniformLocation(program, 'uIsRing'),
            starView: gl.getUniformLocation(starProgram, 'uViewMatrix'),
            starProj: gl.getUniformLocation(starProgram, 'uProjectionMatrix'),
            skyboxView: gl.getUniformLocation(skyboxProgram, 'uViewMatrix'),
            skyboxProj: gl.getUniformLocation(skyboxProgram, 'uProjectionMatrix'),
            skyboxTexture: gl.getUniformLocation(skyboxProgram, 'uSkyboxTexture'),
            coronaModel: gl.getUniformLocation(coronaProgram, 'uModelMatrix'),
            coronaView: gl.getUniformLocation(coronaProgram, 'uViewMatrix'),
            coronaProj: gl.getUniformLocation(coronaProgram, 'uProjectionMatrix'),
            coronaTime: gl.getUniformLocation(coronaProgram, 'uTime'),
            coronaCamera: gl.getUniformLocation(coronaProgram, 'uCameraPosition'),
            coronaSunCenter: gl.getUniformLocation(coronaProgram, 'uSunCenter'),
            coronaSunRadius: gl.getUniformLocation(coronaProgram, 'uSunRadius')
        };

        // ===== Matrix Operations =====
        // Lightweight mat4 helpers used to build model/view/projection transforms.
        // 4x4 matrices are stored in column-major order (WebGL convention).
        // Each function writes into `out` to avoid allocations in the render loop.
        const mat4 = {
            // Allocate a 4x4 matrix (16 floats).
            create: () => new Float32Array(16),
            
            // Identity matrix: diagonal 1s, everything else 0.
            identity: (out) => {
                out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
                out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
                out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
                out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
                return out;
            },
            
            // Perspective projection matrix.
            // fovy: vertical field-of-view in radians, aspect: width/height.
            // near/far: clip planes; depth mapping goes into out[10] and out[14].
            perspective: (out, fovy, aspect, near, far) => {
                const f = 1.0 / Math.tan(fovy / 2);
                out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
                out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
                out[8] = 0; out[9] = 0; out[10] = (far + near) / (near - far); out[11] = -1;
                out[12] = 0; out[13] = 0; out[14] = (2 * far * near) / (near - far); out[15] = 0;
                return out;
            },
            
            // View matrix (camera): points camera at `center` from `eye` with `up` direction.
            // Builds orthonormal basis (right, up, forward) then adds translation.
            lookAt: (out, eye, center, up) => {
                // Forward (camera Z) points from target to eye.
                const z = [eye[0] - center[0], eye[1] - center[1], eye[2] - center[2]];
                const zLen = Math.sqrt(z[0] * z[0] + z[1] * z[1] + z[2] * z[2]);
                z[0] /= zLen; z[1] /= zLen; z[2] /= zLen;
                
                // Right (camera X) = up x forward.
                const x = [
                    up[1] * z[2] - up[2] * z[1],
                    up[2] * z[0] - up[0] * z[2],
                    up[0] * z[1] - up[1] * z[0]
                ];
                const xLen = Math.sqrt(x[0] * x[0] + x[1] * x[1] + x[2] * x[2]);
                x[0] /= xLen; x[1] /= xLen; x[2] /= xLen;
                
                // True up (camera Y) = forward x right.
                const y = [
                    z[1] * x[2] - z[2] * x[1],
                    z[2] * x[0] - z[0] * x[2],
                    z[0] * x[1] - z[1] * x[0]
                ];
                
                // Rotation part of the view matrix (basis vectors as columns).
                out[0] = x[0]; out[1] = y[0]; out[2] = z[0]; out[3] = 0;
                out[4] = x[1]; out[5] = y[1]; out[6] = z[1]; out[7] = 0;
                out[8] = x[2]; out[9] = y[2]; out[10] = z[2]; out[11] = 0;
                // Translation part: move the world opposite the camera position.
                out[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
                out[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
                out[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
                out[15] = 1;
                return out;
            },
            
            // Apply translation by vector v to matrix a (out = a * T).
            translate: (out, a, v) => {
                out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
                out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
                out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
                // Update translation column using existing basis vectors.
                out[12] = a[0] * v[0] + a[4] * v[1] + a[8] * v[2] + a[12];
                out[13] = a[1] * v[0] + a[5] * v[1] + a[9] * v[2] + a[13];
                out[14] = a[2] * v[0] + a[6] * v[1] + a[10] * v[2] + a[14];
                out[15] = a[3] * v[0] + a[7] * v[1] + a[11] * v[2] + a[15];
                return out;
            },
            
            // Apply non-uniform scale by v (x, y, z). Translation stays unchanged.
            scale: (out, a, v) => {
                out[0] = a[0] * v[0]; out[1] = a[1] * v[0]; out[2] = a[2] * v[0]; out[3] = a[3] * v[0];
                out[4] = a[4] * v[1]; out[5] = a[5] * v[1]; out[6] = a[6] * v[1]; out[7] = a[7] * v[1];
                out[8] = a[8] * v[2]; out[9] = a[9] * v[2]; out[10] = a[10] * v[2]; out[11] = a[11] * v[2];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
                return out;
            },
            
            // Rotate around Y axis by `rad` radians (out = a * Ry).
            rotateY: (out, a, rad) => {
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
                const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
                out[0] = a00 * c + a20 * s;
                out[1] = a01 * c + a21 * s;
                out[2] = a02 * c + a22 * s;
                out[3] = a03 * c + a23 * s;
                out[8] = a20 * c - a00 * s;
                out[9] = a21 * c - a01 * s;
                out[10] = a22 * c - a02 * s;
                out[11] = a23 * c - a03 * s;
                out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
                return out;
            },
            
            // Rotate around Z axis by `rad` radians (out = a * Rz).
            rotateZ: (out, a, rad) => {
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
                const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
                out[0] = a00 * c + a10 * s;
                out[1] = a01 * c + a11 * s;
                out[2] = a02 * c + a12 * s;
                out[3] = a03 * c + a13 * s;
                out[4] = a10 * c - a00 * s;
                out[5] = a11 * c - a01 * s;
                out[6] = a12 * c - a02 * s;
                out[7] = a13 * c - a03 * s;
                out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
                return out;
            },
            
            // Rotate around X axis by `rad` radians (out = a * Rx).
            rotateX: (out, a, rad) => {
                const s = Math.sin(rad);
                const c = Math.cos(rad);
                const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
                const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
                out[4] = a10 * c + a20 * s;
                out[5] = a11 * c + a21 * s;
                out[6] = a12 * c + a22 * s;
                out[7] = a13 * c + a23 * s;
                out[8] = a20 * c - a10 * s;
                out[9] = a21 * c - a11 * s;
                out[10] = a22 * c - a12 * s;
                out[11] = a23 * c - a13 * s;
                out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
                out[12] = a[12]; out[13] = a[13]; out[14] = a[14]; out[15] = a[15];
                return out;
            },
            
            // Matrix inverse via cofactors; returns null if not invertible.
            invert: (out, a) => {
                const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
                const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
                const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
                const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
                
                const b00 = a00 * a11 - a01 * a10;
                const b01 = a00 * a12 - a02 * a10;
                const b02 = a00 * a13 - a03 * a10;
                const b03 = a01 * a12 - a02 * a11;
                const b04 = a01 * a13 - a03 * a11;
                const b05 = a02 * a13 - a03 * a12;
                const b06 = a20 * a31 - a21 * a30;
                const b07 = a20 * a32 - a22 * a30;
                const b08 = a20 * a33 - a23 * a30;
                const b09 = a21 * a32 - a22 * a31;
                const b10 = a21 * a33 - a23 * a31;
                const b11 = a22 * a33 - a23 * a32;
                
                let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
                if (!det) return null;
                det = 1.0 / det;
                
                out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
                out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
                out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
                out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
                out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
                out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
                out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
                out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
                out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
                out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
                out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
                out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
                out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
                out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
                out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
                out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
                return out;
            },
            
            // Swap rows/columns (used for normal matrices). Supports in-place transpose.
            transpose: (out, a) => {
                if (out === a) {
                    const a01 = a[1], a02 = a[2], a03 = a[3];
                    const a12 = a[6], a13 = a[7];
                    const a23 = a[11];
                    out[1] = a[4]; out[2] = a[8]; out[3] = a[12];
                    out[4] = a01; out[6] = a[9]; out[7] = a[13];
                    out[8] = a02; out[9] = a12; out[11] = a[14];
                    out[12] = a03; out[13] = a13; out[14] = a23;
                } else {
                    out[0] = a[0]; out[1] = a[4]; out[2] = a[8]; out[3] = a[12];
                    out[4] = a[1]; out[5] = a[5]; out[6] = a[9]; out[7] = a[13];
                    out[8] = a[2]; out[9] = a[6]; out[10] = a[10]; out[11] = a[14];
                    out[12] = a[3]; out[13] = a[7]; out[14] = a[11]; out[15] = a[15];
                }
                return out;
            }
        };

        // ===== Geometry Generation =====
        // Build sphere vertices, normals, UVs, and indices for planets.
        function createSphere(radius, latBands, longBands) {
            const vertices = [];
            const normals = [];
            const texCoords = [];  // UV coordinates for textures
            const indices = [];
            
            for (let lat = 0; lat <= latBands; lat++) {
                const theta = lat * Math.PI / latBands;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                
                for (let long = 0; long <= longBands; long++) {
                    const phi = long * 2 * Math.PI / longBands;
                    const sinPhi = Math.sin(phi);
                    const cosPhi = Math.cos(phi);
                    
                    const x = cosPhi * sinTheta;
                    const y = cosTheta;
                    const z = sinPhi * sinTheta;
                    
                    normals.push(x, y, z);
                    vertices.push(radius * x, radius * y, radius * z);
                    
                    // UV coordinates for spherical mapping (flip V to fix upside-down)
                    const u = 1.0 - (long / longBands);
                    const v = (lat / latBands);  // Removed the "1.0 -" to flip vertically
                    texCoords.push(u, v);
                }
            }
            
            for (let lat = 0; lat < latBands; lat++) {
                for (let long = 0; long < longBands; long++) {
                    const first = lat * (longBands + 1) + long;
                    const second = first + longBands + 1;
                    
                    indices.push(first, second, first + 1);
                    indices.push(second, second + 1, first + 1);
                }
            }
            
            return { vertices, normals, texCoords, indices };
        }

        // ===== Ring Geometry Generation =====
        // Create a flat annulus mesh for planetary rings.
        // Creates a flat ring (disk with hole in center)
        function createRing(innerRadius, outerRadius, segments) {
            const vertices = [];
            const normals = [];
            const texCoords = [];  // UV coordinates for ring texture
            const indices = [];
            
            // Create ring vertices
            for (let i = 0; i <= segments; i++) {
                const theta = (i / segments) * Math.PI * 2;
                const cos = Math.cos(theta);
                const sin = Math.sin(theta);
                
                // Inner vertex
                vertices.push(innerRadius * cos, 0, innerRadius * sin);
                normals.push(0, 1, 0); // Normal points up
                texCoords.push(0.0, i / segments);  // Inner edge UV
                
                // Outer vertex
                vertices.push(outerRadius * cos, 0, outerRadius * sin);
                normals.push(0, 1, 0);
                texCoords.push(1.0, i / segments);  // Outer edge UV
            }
            
            // Create indices for triangles
            for (let i = 0; i < segments; i++) {
                const base = i * 2;
                // First triangle
                indices.push(base, base + 2, base + 1);
                // Second triangle
                indices.push(base + 1, base + 2, base + 3);
            }
            
            return { vertices, normals, texCoords, indices };
        }

        // Create sphere buffers
        const sphere = createSphere(1, 40, 40);
        
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.vertices), gl.STATIC_DRAW);
        
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normals), gl.STATIC_DRAW);
        
        const texCoordBuffer = gl.createBuffer();  // NEW: Texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.texCoords), gl.STATIC_DRAW);
        
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere.indices), gl.STATIC_DRAW);

        // Create ring buffers
        const ring = createRing(1.2, 2.0, 64);
        
        const ringPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ring.vertices), gl.STATIC_DRAW);
        
        const ringNormalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, ringNormalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ring.normals), gl.STATIC_DRAW);
        
        const ringTexCoordBuffer = gl.createBuffer();  // NEW: Ring texture coordinates
        gl.bindBuffer(gl.ARRAY_BUFFER, ringTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(ring.texCoords), gl.STATIC_DRAW);
        
        const ringIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(ring.indices), gl.STATIC_DRAW);

        // ===== Skybox Geometry =====
        // Generate a large sphere used to render the starfield background.
        // Create a large sphere for the skybox background
        const skyboxSphere = createSphere(1500, 30, 30);  // Very large sphere for realistic scale
        
        const skyboxPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxSphere.vertices), gl.STATIC_DRAW);
        
        const skyboxTexCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, skyboxTexCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(skyboxSphere.texCoords), gl.STATIC_DRAW);
        
        const skyboxIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(skyboxSphere.indices), gl.STATIC_DRAW);
        
        // ===== Sun Corona Sphere =====
        // Slightly larger sphere used by the corona shader for the sun glow.
        // Corona sphere is 1.8x the sun's radius for flame effect
        const coronaSphere = createSphere(1.0, 48, 48);  // Unit sphere, scaled in rendering
        
        const coronaPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, coronaPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coronaSphere.vertices), gl.STATIC_DRAW);
        
        const coronaIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coronaIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(coronaSphere.indices), gl.STATIC_DRAW);
        
        const coronaPositionAttr = gl.getAttribLocation(coronaProgram, 'aPosition');

        // ===== Star Generation =====
        // Randomized point stars rendered on top of the skybox.
        function generateStars(count) {
            const positions = [];
            const sizes = [];
            
            for (let i = 0; i < count; i++) {
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(Math.random() * 2 - 1);
                const radius = 150 + Math.random() * 450;
                
                const x = radius * Math.sin(phi) * Math.cos(theta);
                const y = radius * Math.sin(phi) * Math.sin(theta);
                const z = radius * Math.cos(phi);
                
                positions.push(x, y, z);
                sizes.push(0.3 + Math.random() * 2.0);
            }
            
            return { positions, sizes };
        }
        
        const stars = generateStars(3000);
        
        const starPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars.positions), gl.STATIC_DRAW);
        
        const starSizeBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(stars.sizes), gl.STATIC_DRAW);

        // ===== Texture Loading System with Progress Tracking =====
        // Load textures asynchronously and update the loading UI.
        let texturesLoaded = 0;
        const totalTextures = 14;  // Fixed: Actual count of textures
        const loadingProgressEl = document.getElementById('loadingProgress');
        const loadingScreen = document.getElementById('loadingScreen');
        
        function hideLoadingScreen() {
            console.log('Hiding loading screen...');
            loadingScreen.classList.add('loaded');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 800);
        }
        
        function updateLoadingProgress() {
            texturesLoaded++;
            if (loadingProgressEl) {
                loadingProgressEl.textContent = `Loading Textures: ${texturesLoaded}/${totalTextures}`;
            }
            console.log(`Texture loaded: ${texturesLoaded}/${totalTextures}`);
            
            if (texturesLoaded >= totalTextures) {
                setTimeout(hideLoadingScreen, 500);
            }
        }
        
        // Fallback: Hide loading screen after 3 seconds regardless
        setTimeout(() => {
            if (!loadingScreen.classList.contains('loaded')) {
                console.log('Loading screen timeout - forcing hide');
                hideLoadingScreen();
            }
        }, 3000);
        
        function loadTexture(gl, url) {
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            
            // Temporary 1x1 white pixel until image loads
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
                new Uint8Array([255, 255, 255, 255]));
            
            const image = new Image();
            
            image.onerror = () => {
                console.error('Failed to load texture:', url);
                updateLoadingProgress();
            };
            
            image.onload = () => {
                try {
                    gl.bindTexture(gl.TEXTURE_2D, texture);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
                    
                    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
                        gl.generateMipmap(gl.TEXTURE_2D);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                    } else {
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                    }
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    console.log('Loaded:', url);
                    updateLoadingProgress();
                } catch (e) {
                    console.error('Error loading texture:', url, e);
                    updateLoadingProgress();
                }
            };
            
            image.src = url;
            return texture;
        }
        
        function isPowerOf2(value) {
            return (value & (value - 1)) === 0;
        }
        
        // Load all planet textures
        console.log('Initializing texture system...');
        const textures = {
            sun: loadTexture(gl, 'textures/2k_sun.jpg'),
            mercury: loadTexture(gl, 'textures/mercury.jpg'),
            venus: loadTexture(gl, 'textures/2k_venus_surface.jpg'),
            earthDay: loadTexture(gl, 'textures/2k_earth_daymap.jpg'),
            earthNight: loadTexture(gl, 'textures/2k_earth_nightmap.jpg'),
            earthClouds: loadTexture(gl, 'textures/2k_earth_clouds.jpg'),
            mars: loadTexture(gl, 'textures/2k_mars.jpg'),
            jupiter: loadTexture(gl, 'textures/2k_jupiter.jpg'),
            saturn: loadTexture(gl, 'textures/2k_saturn.jpg'),
            uranus: loadTexture(gl, 'textures/2k_uranus.jpg'),
            neptune: loadTexture(gl, 'textures/2k_neptune.jpg'),
            moon: loadTexture(gl, 'textures/2k_moon.jpg'),
            saturnRing: loadTexture(gl, 'textures/2k_saturn_ring_alpha.png'),
            starSkybox: loadTexture(gl, 'textures/2k_stars_milky_way.jpg')
        };

        // ===== Enhanced Planet Data with Realistic Orbital Mechanics =====
        // Orbital/rotation parameters for planets and moons.
        // Elliptical orbits with eccentricity (0 = circle, closer to 1 = more elliptical)
        // ===== REALISTIC SOLAR SYSTEM DATA =====
        // Base astronomical constants and scaling for the simulation.
        // Based on real astronomical measurements, scaled for visualization
        // Distance scale: 1 unit ≈ 0.1 AU (Astronomical Unit)
        // Size scale: Compressed for visibility (true scale would make inner planets invisible)
        // Orbital speed: Based on Kepler's laws (closer = faster)
        // Rotation speed: Based on actual planetary rotation periods
        
        const planets = [
            { 
                // THE SUN - Our star, 109× Earth's diameter, 25-day rotation at equator
                name: 'Sun', 
                radius: 8.0,              // Real: 109× Earth, compressed for visibility
                semiMajorAxis: 0, 
                orbitSpeed: 0, 
                rotationSpeed: 0.008,     // ~25 Earth days per rotation
                eccentricity: 0,
                color: [1.0, 0.95, 0.4], 
                emissive: true, 
                glow: 3.0,
                texture: 'sun',
                moons: []
            },
            { 
                // MERCURY - Smallest planet, closest to Sun, highly elliptical orbit
                name: 'Mercury', 
                radius: 0.35,             // Real: 0.38× Earth
                semiMajorAxis: 12,        // Real: 0.39 AU - closest to Sun
                orbitSpeed: 4.15,         // Real: 88 Earth days (fastest orbit)
                rotationSpeed: 0.003,     // Real: 59 Earth days per rotation (very slow)
                eccentricity: 0.206,      // Real: Most elliptical of the planets
                color: [0.7, 0.7, 0.7], 
                emissive: false, 
                glow: 1.0,
                texture: 'mercury',
                moons: []                 // No moons
            },
            { 
                // VENUS - Similar size to Earth, thick atmosphere, retrograde rotation
                name: 'Venus', 
                radius: 0.90,             // Real: 0.95× Earth
                semiMajorAxis: 18,        // Real: 0.72 AU
                orbitSpeed: 1.62,         // Real: 225 Earth days
                rotationSpeed: -0.001,    // Real: 243 days RETROGRADE (spins backwards!)
                eccentricity: 0.007,      // Real: Nearly circular orbit
                color: [0.95, 0.85, 0.55], 
                emissive: false, 
                glow: 1.0,
                texture: 'venus',
                moons: []                 // No moons
            },
            { 
                // EARTH - Our home, 1 AU reference distance, 365.25 day orbit
                name: 'Earth', 
                radius: 1.0,              // Reference size
                semiMajorAxis: 25,        // Real: 1.00 AU - reference distance
                orbitSpeed: 1.0,          // Real: 365.25 days - reference speed
                rotationSpeed: 0.20,      // Real: 24 hours (1 day)
                eccentricity: 0.017,      // Real: Slightly elliptical
                color: [0.2, 0.5, 0.9], 
                emissive: false, 
                glow: 1.0,
                texture: 'earth',
                isEarth: true,            // Special day/night shader
                moons: [
                    // THE MOON - Earth's only natural satellite, tidally locked
                    { 
                        name: 'Moon', 
                        radius: 0.27,     // Real: 0.27× Earth
                        distance: 3.0,    // Real: ~384,400 km
                        orbitSpeed: 13.37,  // Real: 27.3 days (sidereal) vs 365-day year
                        color: [0.85, 0.85, 0.8], 
                        texture: 'moon' 
                    }
                ]
            },
            { 
                // MARS - The Red Planet, thin atmosphere, two small moons
                name: 'Mars', 
                radius: 0.50,             // Real: 0.53× Earth
                semiMajorAxis: 38,        // Real: 1.52 AU
                orbitSpeed: 0.53,         // Real: 687 Earth days
                rotationSpeed: 0.19,      // Real: 24.6 hours (similar to Earth!)
                eccentricity: 0.093,      // Real: Moderately elliptical
                color: [0.9, 0.4, 0.2], 
                emissive: false, 
                glow: 1.0,
                texture: 'mars',
                moons: [
                    // PHOBOS - Larger inner moon, very close orbit, will crash into Mars
                    { name: 'Phobos', radius: 0.08, distance: 1.2, orbitSpeed: 8.0, color: [0.55, 0.5, 0.45], texture: 'moon' },
                    // DEIMOS - Smaller outer moon, slowly drifting away
                    { name: 'Deimos', radius: 0.05, distance: 1.8, orbitSpeed: 5.0, color: [0.6, 0.55, 0.5], texture: 'moon' }
                ]
            },
            { 
                // JUPITER - King of planets, 11× Earth diameter, fastest rotation
                name: 'Jupiter', 
                radius: 4.0,              // Real: 11.2× Earth (compressed)
                semiMajorAxis: 80,        // Real: 5.20 AU - gas giant territory
                orbitSpeed: 0.084,        // Real: 11.86 Earth years
                rotationSpeed: 0.45,      // Real: 9.9 hours (FASTEST planet rotation!)
                eccentricity: 0.049,      // Real: Low eccentricity
                color: [0.88, 0.72, 0.55], 
                emissive: false, 
                glow: 1.0,
                texture: 'jupiter',
                rings: { 
                    // Jupiter's faint ring system - discovered by Voyager 1 in 1979
                    innerRadius: 4.5, 
                    outerRadius: 5.5, 
                    color: [0.5, 0.45, 0.35], 
                    opacity: 0.08,        // Very faint, mostly dust
                    tilt: 0.05,
                    texture: 'saturnRing'
                },
                moons: [
                    // GALILEAN MOONS - Discovered by Galileo in 1610
                    { name: 'Io', radius: 0.28, distance: 6.5, orbitSpeed: 4.5, color: [0.95, 0.9, 0.4], texture: 'moon' },        // Volcanic moon
                    { name: 'Europa', radius: 0.25, distance: 8.0, orbitSpeed: 3.5, color: [0.9, 0.92, 0.88], texture: 'moon' },   // Ice moon, possible life
                    { name: 'Ganymede', radius: 0.40, distance: 10.0, orbitSpeed: 2.5, color: [0.65, 0.6, 0.55], texture: 'moon' }, // Largest moon in solar system
                    { name: 'Callisto', radius: 0.36, distance: 13.0, orbitSpeed: 1.8, color: [0.45, 0.42, 0.4], texture: 'moon' }  // Ancient, cratered surface
                ]
            },
            { 
                // SATURN - Ringed beauty, second largest, low density (would float in water!)
                name: 'Saturn', 
                radius: 3.4,              // Real: 9.45× Earth (compressed)
                semiMajorAxis: 140,       // Real: 9.58 AU
                orbitSpeed: 0.034,        // Real: 29.46 Earth years
                rotationSpeed: 0.42,      // Real: 10.7 hours (very fast!)
                eccentricity: 0.056,      // Real: Slightly elliptical
                color: [0.96, 0.88, 0.68], 
                emissive: false, 
                glow: 1.0,
                texture: 'saturn',
                rings: { 
                    // Saturn's magnificent ring system - mostly water ice
                    innerRadius: 4.5, 
                    outerRadius: 7.5, 
                    color: [0.92, 0.88, 0.78], 
                    opacity: 0.75,        // Bright, spectacular rings
                    tilt: 0.47,           // Real: 26.7° axial tilt
                    texture: 'saturnRing'
                },
                moons: [
                    // Saturn has 146 known moons!
                    { name: 'Titan', radius: 0.40, distance: 8.0, orbitSpeed: 1.2, color: [0.85, 0.75, 0.55], texture: 'moon' },   // Thick atmosphere, hydrocarbon lakes
                    { name: 'Rhea', radius: 0.15, distance: 5.5, orbitSpeed: 2.5, color: [0.88, 0.88, 0.85], texture: 'moon' },    // Second largest Saturn moon
                    { name: 'Iapetus', radius: 0.12, distance: 10.0, orbitSpeed: 0.8, color: [0.6, 0.55, 0.5], texture: 'moon' },  // Two-tone coloring
                    { name: 'Enceladus', radius: 0.10, distance: 4.0, orbitSpeed: 4.0, color: [0.98, 0.98, 0.98], texture: 'moon' } // Ice geysers, possible life
                ]
            },
            { 
                // URANUS - Ice giant, extreme axial tilt (rolls on its side!)
                name: 'Uranus', 
                radius: 1.8,              // Real: 4.01× Earth
                semiMajorAxis: 280,       // Real: 19.22 AU - ice giant territory
                orbitSpeed: 0.012,        // Real: 84 Earth years!
                rotationSpeed: 0.28,      // Real: 17.2 hours (fast, retrograde)
                eccentricity: 0.046,      // Real: Moderate eccentricity
                color: [0.55, 0.82, 0.88], 
                emissive: false, 
                glow: 1.0,
                texture: 'uranus',
                rings: { 
                    // Uranus's dark ring system - discovered in 1977
                    innerRadius: 2.5, 
                    outerRadius: 3.5, 
                    color: [0.25, 0.3, 0.35], 
                    opacity: 0.20,        // Dark, narrow rings
                    tilt: 1.71,           // Real: 97.8° - nearly sideways!
                    texture: 'saturnRing'
                },
                moons: [
                    { name: 'Titania', radius: 0.20, distance: 5.0, orbitSpeed: 1.5, color: [0.78, 0.78, 0.75], texture: 'moon' },  // Largest Uranian moon
                    { name: 'Oberon', radius: 0.18, distance: 6.5, orbitSpeed: 1.2, color: [0.72, 0.72, 0.7], texture: 'moon' },   // Second largest
                    { name: 'Ariel', radius: 0.15, distance: 3.5, orbitSpeed: 2.2, color: [0.82, 0.82, 0.8], texture: 'moon' },    // Brightest Uranian moon
                    { name: 'Miranda', radius: 0.08, distance: 2.5, orbitSpeed: 3.5, color: [0.7, 0.7, 0.68], texture: 'moon' }    // Bizarre geology
                ]
            },
            { 
                // NEPTUNE - Windiest planet, deepest blue, most distant true planet
                name: 'Neptune', 
                radius: 1.7,              // Real: 3.88× Earth
                semiMajorAxis: 440,       // Real: 30.05 AU - edge of main solar system
                orbitSpeed: 0.006,        // Real: 164.8 Earth years!
                rotationSpeed: 0.30,      // Real: 16.1 hours
                eccentricity: 0.009,      // Real: Nearly circular orbit
                color: [0.25, 0.4, 0.95], 
                emissive: false, 
                glow: 1.0,
                texture: 'neptune',
                rings: { 
                    // Neptune's faint ring system - first imaged by Voyager 2 in 1989
                    innerRadius: 2.2, 
                    outerRadius: 3.2, 
                    color: [0.35, 0.4, 0.5], 
                    opacity: 0.12,        // Very faint
                    tilt: 0.49,           // Real: 28.3° axial tilt
                    texture: 'saturnRing'
                },
                moons: [
                    // TRITON - Captured Kuiper Belt object, retrograde orbit
                    { name: 'Triton', radius: 0.25, distance: 5.0, orbitSpeed: -1.5, color: [0.85, 0.88, 0.92], texture: 'moon' }
                ]
            }
        ];

        // ===== Framebuffer Setup for Bloom =====
        // Offscreen buffers for extracting/blur-combining bright pixels.
        let framebuffers = {};
        
        function createFramebuffers() {
            const width = canvas.width;
            const height = canvas.height;
            
            framebuffers.scene = createFramebuffer(width, height);
            framebuffers.bright = createFramebuffer(width / 2, height / 2);
            framebuffers.blur1 = createFramebuffer(width / 2, height / 2);
            framebuffers.blur2 = createFramebuffer(width / 2, height / 2);
        }
        
        function createFramebuffer(width, height) {
            const framebuffer = gl.createFramebuffer();
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
            
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
            
            const renderbuffer = gl.createRenderbuffer();
            gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
            gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
            gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderbuffer);
            
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            
            return { framebuffer, texture, width, height };
        }
        
        // Fullscreen quad for post-processing
        const quadBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);

        // ===== Camera Controls =====
        // Mouse/keyboard input to orbit, pan, and zoom the camera.
        // Adjusted for realistic solar system scale
        let cameraDistance = 150;         // Start further out to see inner planets
        let cameraAngleX = 0.35;          // Slight top-down angle
        let cameraAngleY = 0;
        let cameraOffsetX = 0;
        let cameraOffsetY = 0;
        
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        // Planet tracking system - can track any planet!
        let trackingPlanet = null;        // Name of planet being tracked (null = overview mode)
        let trackedPlanetPosition = [0, 0, 0];  // Current position of tracked planet
        let targetCameraDistance = 150;   // Match initial distance
        let targetOffsetX = 0;
        let targetOffsetY = 0;
        
        // Store all planet positions for tracking
        let planetPositions = {};

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastMouseX = e.clientX;
            lastMouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = e.clientX - lastMouseX;
                const deltaY = e.clientY - lastMouseY;
                
                cameraAngleY += deltaX * 0.01;
                cameraAngleX += deltaY * 0.01;
                cameraAngleX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, cameraAngleX));
                
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
        });

        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // Calculate zoom amount based on scroll direction
            const zoomAmount = e.deltaY * 0.5;
            
            if (trackingPlanet) {
                // When tracking a planet, adjust target distance (closer range)
                targetCameraDistance += zoomAmount * 0.15;
                targetCameraDistance = Math.max(3, Math.min(50, targetCameraDistance));
            } else {
                // Normal zoom - update BOTH values to prevent snap-back
                targetCameraDistance += zoomAmount;
                targetCameraDistance = Math.max(30, Math.min(800, targetCameraDistance));
                cameraDistance = targetCameraDistance; // Sync immediately
            }
        }, { passive: false });

        // Enhanced keyboard controls
        window.addEventListener('keydown', (e) => {
            const panSpeed = 5.0;    // Increased for larger scale
            const zoomSpeed = 10.0;  // Increased for larger scale
            
            switch(e.key.toLowerCase()) {
                // Arrow keys - Pan camera (disabled when tracking a planet)
                case 'arrowleft': 
                    if (!trackingPlanet) cameraOffsetX -= panSpeed; 
                    break;
                case 'arrowright': 
                    if (!trackingPlanet) cameraOffsetX += panSpeed; 
                    break;
                case 'arrowup': 
                    if (!trackingPlanet) cameraOffsetY += panSpeed; 
                    break;
                case 'arrowdown': 
                    if (!trackingPlanet) cameraOffsetY -= panSpeed; 
                    break;
                
                // WASD - Advanced camera movement (adjusted for realistic scale)
                case 'w': 
                    if (trackingPlanet) {
                        targetCameraDistance = Math.max(3, targetCameraDistance - 2);
                    } else {
                        targetCameraDistance = Math.max(30, targetCameraDistance - zoomSpeed);
                        cameraDistance = targetCameraDistance;
                    }
                    break;
                case 's': 
                    if (trackingPlanet) {
                        targetCameraDistance = Math.min(50, targetCameraDistance + 2);
                    } else {
                        targetCameraDistance = Math.min(800, targetCameraDistance + zoomSpeed);
                        cameraDistance = targetCameraDistance;
                    }
                    break;
                case 'a': 
                    cameraAngleY -= 0.05; 
                    break;
                case 'd': 
                    cameraAngleY += 0.05; 
                    break;
                
                // QE - Vertical movement (disabled when tracking a planet)
                case 'q': 
                    if (!trackingPlanet) cameraOffsetY -= panSpeed; 
                    break;
                case 'e': 
                    if (!trackingPlanet) cameraOffsetY += panSpeed; 
                    break;
                
                // R - Reset camera
                case 'r':
                    cameraDistance = 55;
                    cameraAngleX = 0.4;
                    cameraAngleY = 0;
                    cameraOffsetX = 0;
                    cameraOffsetY = 0;
                    break;
            }
        });

        // ===== Rendering Functions =====
        // Draw helpers for planets, trails, skybox, and post-processing.
        function renderQuad(program) {
            gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
            const posLoc = gl.getAttribLocation(program, 'aPosition');
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        }

        function renderCelestialBody(modelMatrix, color, isEmissive, glow, textureName, isEarth = false, isRing = false) {
            const normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            
            gl.uniformMatrix4fv(uniforms.modelMatrix, false, modelMatrix);
            gl.uniformMatrix4fv(uniforms.normalMatrix, false, normalMatrix);
            gl.uniform3fv(uniforms.color, color);
            gl.uniform1i(uniforms.isEmissive, isEmissive);
            gl.uniform1f(uniforms.glow, glow);
            
            // Ensure correct buffers are bound
            if (!isRing) {
                gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                gl.enableVertexAttribArray(attrs.position);
                gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
                
                gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                gl.enableVertexAttribArray(attrs.normal);
                gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
                
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            }
            
            // Bind texture coordinate buffer
            gl.bindBuffer(gl.ARRAY_BUFFER, isRing ? ringTexCoordBuffer : texCoordBuffer);
            gl.enableVertexAttribArray(attrs.texCoord);
            gl.vertexAttribPointer(attrs.texCoord, 2, gl.FLOAT, false, 0, 0);
            
            // Handle textures
            if (textureName) {
                // Check if texture exists (special case for Earth which has multiple textures)
                const hasValidTexture = isEarth || (textures[textureName] !== undefined);
                
                if (hasValidTexture) {
                    gl.uniform1i(uniforms.hasTexture, true);
                    gl.uniform1i(uniforms.isEarth, isEarth);
                    gl.uniform1i(uniforms.isRing, isRing);
                    
                    if (isEarth) {
                        // Earth: Bind day, night, and cloud textures to separate texture units
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, textures.earthDay);
                        gl.uniform1i(uniforms.earthDay, 0);
                        
                        gl.activeTexture(gl.TEXTURE1);
                        gl.bindTexture(gl.TEXTURE_2D, textures.earthNight);
                        gl.uniform1i(uniforms.earthNight, 1);
                        
                        gl.activeTexture(gl.TEXTURE2);
                        gl.bindTexture(gl.TEXTURE_2D, textures.earthClouds);
                        gl.uniform1i(uniforms.earthClouds, 2);
                    } else {
                        // Regular texture
                        gl.activeTexture(gl.TEXTURE0);
                        gl.bindTexture(gl.TEXTURE_2D, textures[textureName]);
                        gl.uniform1i(uniforms.texture, 0);
                    }
                } else {
                    gl.uniform1i(uniforms.hasTexture, false);
                    gl.uniform1i(uniforms.isEarth, false);
                    gl.uniform1i(uniforms.isRing, false);
                }
            } else {
                gl.uniform1i(uniforms.hasTexture, false);
                gl.uniform1i(uniforms.isEarth, false);
                gl.uniform1i(uniforms.isRing, false);
            }
            
            const indexCount = isRing ? ring.indices.length : sphere.indices.length;
            gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0);
        }

        function renderScene(viewMatrix, projectionMatrix, galacticOffset, time) {
            // ===== RENDER ORBITAL TRAILS =====
            // Draw line strips that visualize recent orbital paths.
            gl.useProgram(trailProgram);
            gl.lineWidth(2.0);
            
            // Enable blending for transparent trails
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            
            const trailViewLoc = gl.getUniformLocation(trailProgram, 'uViewMatrix');
            const trailProjLoc = gl.getUniformLocation(trailProgram, 'uProjectionMatrix');
            const trailColorLoc = gl.getUniformLocation(trailProgram, 'uColor');
            const trailPosLoc = gl.getAttribLocation(trailProgram, 'aPosition');
            
            gl.uniformMatrix4fv(trailViewLoc, false, viewMatrix);
            gl.uniformMatrix4fv(trailProjLoc, false, projectionMatrix);
            
            // Draw trails for each planet
            planets.forEach((planet, idx) => {
                if (planet.semiMajorAxis === 0) return; // Skip Sun
                
                const trail = trailHistory.get(idx);
                if (trail && trail.length > 1) {
                    const trailBuffer = gl.createBuffer();
                    gl.bindBuffer(gl.ARRAY_BUFFER, trailBuffer);
                    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(trail.flat()), gl.DYNAMIC_DRAW);
                    
                    gl.enableVertexAttribArray(trailPosLoc);
                    gl.vertexAttribPointer(trailPosLoc, 3, gl.FLOAT, false, 0, 0);
                    
                    // Blue-ish trail color with transparency based on planet color
                    const alpha = 0.4;
                    gl.uniform4f(trailColorLoc, 
                        planet.color[0] * 0.5 + 0.2, 
                        planet.color[1] * 0.5 + 0.3, 
                        planet.color[2] * 0.5 + 0.8, 
                        alpha);
                    
                    gl.drawArrays(gl.LINE_STRIP, 0, trail.length);
                    gl.deleteBuffer(trailBuffer);
                }
            });
            
            // ===== RENDER PLANETS =====
            // Compute planet transforms, render bodies, rings, and moons.
            gl.disable(gl.BLEND); // Disable blending for solid planets
            gl.useProgram(program);
            
            // Bind planet buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
            gl.enableVertexAttribArray(attrs.position);
            gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
            gl.enableVertexAttribArray(attrs.normal);
            gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
            gl.enableVertexAttribArray(attrs.texCoord);
            gl.vertexAttribPointer(attrs.texCoord, 2, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            
            // Send matrices
            gl.uniformMatrix4fv(uniforms.viewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projectionMatrix);
            gl.uniform3f(uniforms.lightPosition, galacticOffset[0], galacticOffset[1], galacticOffset[2]);
            
            const cameraX = cameraOffsetX + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
            const cameraY = cameraOffsetY + cameraDistance * Math.sin(cameraAngleX);
            const cameraZ = cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
            gl.uniform3f(uniforms.cameraPosition, cameraX, cameraY, cameraZ);
            
            // Render planets and their moons
            planets.forEach((planet, idx) => {
                const modelMatrix = mat4.create();
                mat4.identity(modelMatrix);
                
                // Apply galactic motion
                mat4.translate(modelMatrix, modelMatrix, galacticOffset);
                
                // Elliptical orbital position using Kepler's laws
                let planetX = 0, planetZ = 0;
                if (planet.semiMajorAxis > 0) {
                    // Mean anomaly (angle progresses uniformly with time)
                    const meanAnomaly = time * planet.orbitSpeed;
                    
                    // Solve Kepler's equation for eccentric anomaly (simplified approximation)
                    // E = M + e*sin(M) for small eccentricities
                    const e = planet.eccentricity;
                    let E = meanAnomaly + e * Math.sin(meanAnomaly);
                    
                    // True anomaly (actual angle from perihelion)
                    const trueAnomaly = 2 * Math.atan2(
                        Math.sqrt(1 + e) * Math.sin(E / 2),
                        Math.sqrt(1 - e) * Math.cos(E / 2)
                    );
                    
                    // Distance from Sun (varies with position in orbit)
                    const a = planet.semiMajorAxis;
                    const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
                    
                    // Counter-clockwise elliptical orbit (prograde motion)
                    planetX = r * Math.cos(trueAnomaly);
                    planetZ = r * Math.sin(trueAnomaly);
                    
                    mat4.translate(modelMatrix, modelMatrix, [planetX, 0, planetZ]);
                }
                
                // Store planet position for moons AND trail recording
                const planetPosition = [
                    galacticOffset[0] + planetX,
                    galacticOffset[1],
                    galacticOffset[2] + planetZ
                ];
                
                // Record trail position (helical elliptical path)
                if (planet.semiMajorAxis > 0) {
                    const trail = trailHistory.get(idx);
                    trail.push([...planetPosition]);
                    
                    // Keep trail length manageable
                    if (trail.length > maxTrailLength) {
                        trail.shift();
                    }
                }
                
                // Store ALL planet positions for camera tracking
                planetPositions[planet.name] = [...planetPosition];
                
                // Update tracked planet position
                if (trackingPlanet === planet.name) {
                    trackedPlanetPosition = [...planetPosition];
                }
                
                // Planetary rotation (spin on axis)
                const rotationAngle = time * planet.rotationSpeed;
                mat4.rotateY(modelMatrix, modelMatrix, rotationAngle);
                
                // Scale
                mat4.scale(modelMatrix, modelMatrix, [planet.radius, planet.radius, planet.radius]);
                
                // Debug Earth rendering once
                if (planet.name === 'Earth' && !earthDebugLogged) {
                    console.log('🌍 Earth rendering info:', {
                        texture: planet.texture,
                        isEarth: planet.isEarth,
                        rotationAngle: rotationAngle,
                        rotationSpeed: planet.rotationSpeed,
                        hasEarthDay: !!textures.earthDay,
                        hasEarthNight: !!textures.earthNight,
                        hasEarthClouds: !!textures.earthClouds
                    });
                    earthDebugLogged = true;
                }
                
                // Render planet with texture
                renderCelestialBody(modelMatrix, planet.color, planet.emissive, planet.glow, 
                    planet.texture, planet.isEarth || false, false);
                
                // Render planetary rings if they exist
                if (planet.rings) {
                    // Enable blending for semi-transparent rings
                    gl.enable(gl.BLEND);
                    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                    
                    // Switch to ring buffers
                    gl.bindBuffer(gl.ARRAY_BUFFER, ringPositionBuffer);
                    gl.enableVertexAttribArray(attrs.position);
                    gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, ringNormalBuffer);
                    gl.enableVertexAttribArray(attrs.normal);
                    gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ringIndexBuffer);
                    
                    // Create ring transformation matrix
                    const ringMatrix = mat4.create();
                    mat4.identity(ringMatrix);
                    
                    // Position at planet location (using same elliptical calculation)
                    mat4.translate(ringMatrix, ringMatrix, galacticOffset);
                    if (planet.semiMajorAxis > 0) {
                        const meanAnomaly = time * planet.orbitSpeed;
                        const e = planet.eccentricity;
                        let E = meanAnomaly + e * Math.sin(meanAnomaly);
                        const trueAnomaly = 2 * Math.atan2(
                            Math.sqrt(1 + e) * Math.sin(E / 2),
                            Math.sqrt(1 - e) * Math.cos(E / 2)
                        );
                        const a = planet.semiMajorAxis;
                        const r = a * (1 - e * e) / (1 + e * Math.cos(trueAnomaly));
                        const x = r * Math.cos(trueAnomaly);
                        const z = r * Math.sin(trueAnomaly);
                        mat4.translate(ringMatrix, ringMatrix, [x, 0, z]);
                    }
                    
                    // Tilt the ring
                    mat4.rotateX(ringMatrix, ringMatrix, planet.rings.tilt);
                    
                    // Rotate with planet
                    mat4.rotateY(ringMatrix, ringMatrix, time * planet.rotationSpeed);
                    
                    // Scale ring
                    const ringScale = planet.radius * (planet.rings.outerRadius / 2.0);
                    mat4.scale(ringMatrix, ringMatrix, [ringScale, ringScale, ringScale]);
                    
                    // Calculate normal matrix for ring
                    const ringNormalMatrix = mat4.create();
                    mat4.invert(ringNormalMatrix, ringMatrix);
                    mat4.transpose(ringNormalMatrix, ringMatrix);
                    
                    // Bind ring texture coordinates
                    gl.bindBuffer(gl.ARRAY_BUFFER, ringTexCoordBuffer);
                    gl.enableVertexAttribArray(attrs.texCoord);
                    gl.vertexAttribPointer(attrs.texCoord, 2, gl.FLOAT, false, 0, 0);
                    
                    // Set uniforms for ring
                    gl.uniformMatrix4fv(uniforms.modelMatrix, false, ringMatrix);
                    gl.uniformMatrix4fv(uniforms.normalMatrix, false, ringNormalMatrix);
                    gl.uniform3fv(uniforms.color, planet.rings.color);
                    gl.uniform1i(uniforms.isEmissive, false);
                    gl.uniform1f(uniforms.glow, planet.rings.opacity);
                    gl.uniform1i(uniforms.isRing, true);
                    gl.uniform1i(uniforms.hasTexture, true);
                    gl.uniform1i(uniforms.isEarth, false);
                    
                    // Bind ring texture with alpha
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, textures[planet.rings.texture]);
                    gl.uniform1i(uniforms.texture, 0);
                    
                    // Draw ring
                    gl.drawElements(gl.TRIANGLES, ring.indices.length, gl.UNSIGNED_SHORT, 0);
                    
                    // Disable blending and restore planet buffers
                    gl.disable(gl.BLEND);
                    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
                    gl.enableVertexAttribArray(attrs.position);
                    gl.vertexAttribPointer(attrs.position, 3, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
                    gl.enableVertexAttribArray(attrs.normal);
                    gl.vertexAttribPointer(attrs.normal, 3, gl.FLOAT, false, 0, 0);
                    
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
                }
                
                // Render moons
                planet.moons.forEach(moon => {
                    const moonMatrix = mat4.create();
                    mat4.identity(moonMatrix);
                    
                    // Position relative to planet
                    mat4.translate(moonMatrix, moonMatrix, planetPosition);
                    
                    // Moon orbital position around planet
                    const moonOrbitAngle = time * moon.orbitSpeed;
                    const moonX = moon.distance * Math.cos(moonOrbitAngle);
                    const moonZ = moon.distance * Math.sin(moonOrbitAngle);
                    mat4.translate(moonMatrix, moonMatrix, [moonX, 0, moonZ]);
                    
                    // Default to synchronous rotation (tidal locking) if no spinSpeed override is set
                    const moonSpinSpeed = moon.spinSpeed ?? moon.orbitSpeed;
                    const moonSpinAngle = time * moonSpinSpeed;
                    mat4.rotateY(moonMatrix, moonMatrix, moonSpinAngle);
                    
                    // Scale
                    mat4.scale(moonMatrix, moonMatrix, [moon.radius, moon.radius, moon.radius]);
                    
                    // Render moon with texture
                    renderCelestialBody(moonMatrix, moon.color, false, 1.0, moon.texture, false, false);
                });
            });
            
            // ===== RENDER SUN CORONA (Flames) =====
            // Render additive glow using a separate corona shader.
            gl.useProgram(coronaProgram);
            
            // Enable blending for transparent corona
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);  // Additive blending for glow
            gl.depthMask(false);  // Don't write to depth buffer
            
            // Corona model matrix - positioned at sun with larger scale
            const sunRadius = 8.0;  // Match sun's radius
            const coronaScale = sunRadius * 1.8;  // Corona extends beyond sun
            
            const coronaMatrix = mat4.create();
            mat4.identity(coronaMatrix);
            mat4.translate(coronaMatrix, coronaMatrix, galacticOffset);  // Sun is at galactic center
            mat4.scale(coronaMatrix, coronaMatrix, [coronaScale, coronaScale, coronaScale]);
            
            // Set uniforms
            gl.uniformMatrix4fv(uniforms.coronaModel, false, coronaMatrix);
            gl.uniformMatrix4fv(uniforms.coronaView, false, viewMatrix);
            gl.uniformMatrix4fv(uniforms.coronaProj, false, projectionMatrix);
            gl.uniform1f(uniforms.coronaTime, time);
            gl.uniform3fv(uniforms.coronaSunCenter, galacticOffset);
            gl.uniform1f(uniforms.coronaSunRadius, sunRadius);
            
            // Get camera position for the corona shader
            const camPos = [
                cameraOffsetX + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY),
                cameraOffsetY + cameraDistance * Math.sin(cameraAngleX),
                galacticOffset[2] + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY)
            ];
            gl.uniform3fv(uniforms.coronaCamera, camPos);
            
            // Bind corona geometry
            gl.bindBuffer(gl.ARRAY_BUFFER, coronaPositionBuffer);
            gl.enableVertexAttribArray(coronaPositionAttr);
            gl.vertexAttribPointer(coronaPositionAttr, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, coronaIndexBuffer);
            gl.drawElements(gl.TRIANGLES, coronaSphere.indices.length, gl.UNSIGNED_SHORT, 0);
            
            // Restore state
            gl.depthMask(true);
            gl.disable(gl.BLEND);
        }

        // ===== Orbital Trail System =====
        // Keep a history of positions per planet to build trails.
        const trailHistory = new Map(); // Store trail positions for each planet
        const maxTrailLength = 200; // Number of trail points
        
        // Initialize trails for each planet
        planets.forEach((planet, idx) => {
            trailHistory.set(idx, []);
        });
        
        // Debug flag to log Earth rendering only once
        let earthDebugLogged = false;
        
        // ===== Main Render Loop =====
        // Advance time, update camera, render scene, then post-process.
        let time = 0;
        
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        
        function render() {
            // Apply speed multiplier to time increment
            time += 0.01 * speedMultiplier;
            
            // Vertical motion through space - solar system moves upward along Y
            const verticalMotion = time * 8.0; // Upward along Y (scaled for realistic distances)
            const galacticOffset = [
                0, // No X drift
                verticalMotion,
                0 // No Z drift
            ];
            
            // Camera setup - keep Y drift visible while orbiting the system
            
            let lookAtTarget = [cameraOffsetX, cameraOffsetY, galacticOffset[2]];
            let cameraX, cameraY, cameraZ;
            
            if (trackingPlanet && trackedPlanetPosition[0] !== undefined) {
                // PLANET TRACKING MODE
                // Very smooth but responsive interpolation
                const lerpFactor = 0.12;
                
                // Update target offsets to tracked planet's position
                targetOffsetX = trackedPlanetPosition[0];
                targetOffsetY = trackedPlanetPosition[1];
                
                // Smoothly move camera offsets to planet
                cameraOffsetX += (targetOffsetX - cameraOffsetX) * lerpFactor;
                cameraOffsetY += (targetOffsetY - cameraOffsetY) * lerpFactor;
                
                // Smoothly zoom to target distance
                cameraDistance += (targetCameraDistance - cameraDistance) * lerpFactor;
                
                // Camera orbits around tracked planet's 3D position
                cameraX = trackedPlanetPosition[0] + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
                cameraY = trackedPlanetPosition[1] + cameraDistance * Math.sin(cameraAngleX);
                cameraZ = trackedPlanetPosition[2] + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
                
                // Look directly AT the planet's exact position
                lookAtTarget = [trackedPlanetPosition[0], trackedPlanetPosition[1], trackedPlanetPosition[2]];
            } else {
                // OVERVIEW MODE - No interpolation, direct control
                cameraDistance = targetCameraDistance;
                
                // Camera orbits around solar system center
                cameraX = cameraOffsetX + cameraDistance * Math.cos(cameraAngleX) * Math.sin(cameraAngleY);
                cameraY = cameraOffsetY + cameraDistance * Math.sin(cameraAngleX);
                cameraZ = galacticOffset[2] + cameraDistance * Math.cos(cameraAngleX) * Math.cos(cameraAngleY);
                
                // Look at solar system center
                lookAtTarget = [cameraOffsetX, cameraOffsetY, galacticOffset[2]];
            }
            
            const viewMatrix = mat4.create();
            mat4.lookAt(viewMatrix, 
                [cameraX, cameraY, cameraZ], 
                lookAtTarget, 
                [0, 1, 0]);
            
            const projectionMatrix = mat4.create();
            mat4.perspective(projectionMatrix, Math.PI / 4, canvas.width / canvas.height, 0.1, 2000);
            
            // ===== RENDER TO SCENE FRAMEBUFFER =====
            // Render skybox + planets into an offscreen scene texture.
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.scene.framebuffer);
            gl.viewport(0, 0, framebuffers.scene.width, framebuffers.scene.height);
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.enable(gl.DEPTH_TEST);
            
            // Render skybox first (background)
            gl.useProgram(skyboxProgram);
            gl.disable(gl.DEPTH_TEST);
            gl.depthMask(false);  // Don't write to depth buffer
            
            gl.uniformMatrix4fv(uniforms.skyboxView, false, viewMatrix);
            gl.uniformMatrix4fv(uniforms.skyboxProj, false, projectionMatrix);
            
            // Bind skybox texture
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, textures.starSkybox);
            gl.uniform1i(uniforms.skyboxTexture, 0);
            
            // Bind skybox buffers
            gl.bindBuffer(gl.ARRAY_BUFFER, skyboxPositionBuffer);
            gl.enableVertexAttribArray(attrs.skyboxPosition);
            gl.vertexAttribPointer(attrs.skyboxPosition, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, skyboxTexCoordBuffer);
            gl.enableVertexAttribArray(attrs.skyboxTexCoord);
            gl.vertexAttribPointer(attrs.skyboxTexCoord, 2, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, skyboxIndexBuffer);
            gl.drawElements(gl.TRIANGLES, skyboxSphere.indices.length, gl.UNSIGNED_SHORT, 0);
            
            // Render additional point stars for sparkle
            gl.useProgram(starProgram);
            
            gl.uniformMatrix4fv(uniforms.starView, false, viewMatrix);
            gl.uniformMatrix4fv(uniforms.starProj, false, projectionMatrix);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, starPositionBuffer);
            gl.enableVertexAttribArray(attrs.starPosition);
            gl.vertexAttribPointer(attrs.starPosition, 3, gl.FLOAT, false, 0, 0);
            
            gl.bindBuffer(gl.ARRAY_BUFFER, starSizeBuffer);
            gl.enableVertexAttribArray(attrs.starSize);
            gl.vertexAttribPointer(attrs.starSize, 1, gl.FLOAT, false, 0, 0);
            
            gl.drawArrays(gl.POINTS, 0, stars.positions.length / 3);
            
            // Render planets and moons
            gl.enable(gl.DEPTH_TEST);
            gl.depthMask(true);  // Re-enable depth writing
            renderScene(viewMatrix, projectionMatrix, galacticOffset, time);
            
            // ===== BLOOM POST-PROCESSING =====
            // Extract highlights, blur, then combine with the scene.
            gl.disable(gl.DEPTH_TEST);
            
            // Extract bright areas
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.bright.framebuffer);
            gl.viewport(0, 0, framebuffers.bright.width, framebuffers.bright.height);
            gl.useProgram(bloomExtractProgram);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.scene.texture);
            gl.uniform1i(gl.getUniformLocation(bloomExtractProgram, 'uTexture'), 0);
            gl.uniform1f(gl.getUniformLocation(bloomExtractProgram, 'uThreshold'), 0.7);
            renderQuad(bloomExtractProgram);
            
            // Blur horizontally
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.blur1.framebuffer);
            gl.useProgram(bloomBlurProgram);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.bright.texture);
            gl.uniform1i(gl.getUniformLocation(bloomBlurProgram, 'uTexture'), 0);
            gl.uniform2f(gl.getUniformLocation(bloomBlurProgram, 'uDirection'), 1.0, 0.0);
            gl.uniform2f(gl.getUniformLocation(bloomBlurProgram, 'uResolution'), 
                framebuffers.blur1.width, framebuffers.blur1.height);
            renderQuad(bloomBlurProgram);
            
            // Blur vertically
            gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffers.blur2.framebuffer);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.blur1.texture);
            gl.uniform2f(gl.getUniformLocation(bloomBlurProgram, 'uDirection'), 0.0, 1.0);
            renderQuad(bloomBlurProgram);
            
            // Combine scene + bloom
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.useProgram(bloomCombineProgram);
            
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.scene.texture);
            gl.uniform1i(gl.getUniformLocation(bloomCombineProgram, 'uScene'), 0);
            
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, framebuffers.blur2.texture);
            gl.uniform1i(gl.getUniformLocation(bloomCombineProgram, 'uBloom'), 1);
            gl.uniform1f(gl.getUniformLocation(bloomCombineProgram, 'uBloomIntensity'), 1.2);
            
            renderQuad(bloomCombineProgram);
            
            requestAnimationFrame(render);
        }
        
        render();

}

window.SolarSystemWebGL = { init: initSolarSystem };
