precision mediump float;
        
        uniform vec3 uColor;
        uniform vec3 uLightPosition;
        uniform bool uIsEmissive;
        uniform vec3 uCameraPosition;
        uniform float uGlow;
        
        uniform sampler2D uTexture;      // Main texture
        uniform bool uHasTexture;        // Whether to use texture
        uniform bool uIsEarth;           // Special Earth handling
        uniform sampler2D uEarthDay;     // Earth day texture
        uniform sampler2D uEarthNight;   // Earth night texture (city lights)
        uniform sampler2D uEarthClouds;  // Earth cloud layer
        uniform bool uIsRing;            // Ring texture with alpha
        
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vTexCoord;
        
        void main() {
            vec3 baseColor;
            
            if (uHasTexture) {
                if (uIsEarth) {
                    // EARTH: Blend day/night based on Sun direction
                    vec3 normal = normalize(vNormal);
                    vec3 lightDir = normalize(uLightPosition - vPosition);
                    
                    // How much this fragment faces the sun (-1 to 1)
                    float sunDot = dot(normal, lightDir);
                    
                    // Sample all Earth textures
                    vec3 dayTexture = texture2D(uEarthDay, vTexCoord).rgb;
                    vec3 nightTexture = texture2D(uEarthNight, vTexCoord).rgb;
                    vec3 clouds = texture2D(uEarthClouds, vTexCoord).rgb;
                    
                    // Dramatic day/night transition
                    // sunDot > 0 = facing sun (day), < 0 = facing away (night)
                    float dayAmount = smoothstep(-0.02, 0.02, sunDot);
                    
                    // Mix day and night - night lights are BOOSTED for visibility
                    vec3 surface = mix(
                        nightTexture * 5.0,  // Night lights very bright
                        dayTexture,           // Day side normal
                        dayAmount
                    );
                    
                    // Add clouds on top (brighter clouds, partial transparency)
                    float cloudMask = (clouds.r + clouds.g + clouds.b) / 3.0;
                    baseColor = mix(surface, clouds * 1.5, cloudMask * 0.5);
                } else {
                    baseColor = texture2D(uTexture, vTexCoord).rgb;
                }
            } else {
                baseColor = uColor;
            }
            
            if (uIsEmissive) {
                gl_FragColor = vec4(baseColor * uGlow, 1.0);
            } else if (uIsEarth) {
                // Earth: Day/night already blended in baseColor, apply minimal lighting
                vec3 normal = normalize(vNormal);
                vec3 viewDir = normalize(uCameraPosition - vPosition);
                vec3 halfDir = normalize(normalize(uLightPosition - vPosition) + viewDir);
                
                // Subtle ambient for dark side visibility
                vec3 ambient = 0.02 * baseColor;
                
                // Add specular for ocean reflections
                float spec = pow(max(dot(normal, halfDir), 0.0), 32.0);
                vec3 specular = vec3(0.2) * spec;
                
                // Rim lighting for atmosphere
                float rimFactor = 1.0 - max(dot(viewDir, normal), 0.0);
                rimFactor = pow(rimFactor, 3.0);
                vec3 rimLight = vec3(0.3, 0.5, 0.8) * rimFactor * 0.4;
                
                vec3 result = baseColor + ambient + specular + rimLight;
                gl_FragColor = vec4(result, 1.0);
            } else {
                vec3 normal = normalize(vNormal);
                vec3 lightDir = normalize(uLightPosition - vPosition);
                vec3 viewDir = normalize(uCameraPosition - vPosition);
                vec3 halfDir = normalize(lightDir + viewDir);
                
                vec3 ambient = 0.05 * baseColor;
                
                float diff = max(dot(normal, lightDir), 0.0);
                vec3 diffuse = diff * baseColor;
                
                float spec = pow(max(dot(normal, halfDir), 0.0), 64.0);
                vec3 specular = vec3(0.4) * spec;
                
                float rimFactor = 1.0 - max(dot(viewDir, normal), 0.0);
                rimFactor = pow(rimFactor, 3.0);
                vec3 rimLight = baseColor * rimFactor * 0.3;
                
                float distance = length(uLightPosition - vPosition);
                float attenuation = 1.0 / (1.0 + 0.01 * distance + 0.001 * distance * distance);
                
                vec3 result = ambient + (diffuse + specular + rimLight) * attenuation;
                
                // Handle ring transparency
                float alpha = 1.0;
                if (uIsRing && uHasTexture) {
                    alpha = texture2D(uTexture, vTexCoord).a * uGlow;
                } else if (uGlow < 1.0) {
                    alpha = uGlow;
                }
                
                gl_FragColor = vec4(result, alpha);
            }
        }
