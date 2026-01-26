precision mediump float;
        
        uniform float uTime;
        uniform vec3 uCameraPosition;
        uniform vec3 uSunCenter;
        uniform float uSunRadius;
        
        varying vec3 vPosition;
        varying vec3 vWorldPosition;
        
        // Simplex noise functions for flame effect
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
        
        float snoise(vec3 v) {
            const vec2 C = vec2(1.0/6.0, 1.0/3.0);
            const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
            
            vec3 i = floor(v + dot(v, C.yyy));
            vec3 x0 = v - i + dot(i, C.xxx);
            
            vec3 g = step(x0.yzx, x0.xyz);
            vec3 l = 1.0 - g;
            vec3 i1 = min(g.xyz, l.zxy);
            vec3 i2 = max(g.xyz, l.zxy);
            
            vec3 x1 = x0 - i1 + C.xxx;
            vec3 x2 = x0 - i2 + C.yyy;
            vec3 x3 = x0 - D.yyy;
            
            i = mod289(i);
            vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
                
            float n_ = 0.142857142857;
            vec3 ns = n_ * D.wyz - D.xzx;
            
            vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
            
            vec4 x_ = floor(j * ns.z);
            vec4 y_ = floor(j - 7.0 * x_);
            
            vec4 x = x_ *ns.x + ns.yyyy;
            vec4 y = y_ *ns.x + ns.yyyy;
            vec4 h = 1.0 - abs(x) - abs(y);
            
            vec4 b0 = vec4(x.xy, y.xy);
            vec4 b1 = vec4(x.zw, y.zw);
            
            vec4 s0 = floor(b0)*2.0 + 1.0;
            vec4 s1 = floor(b1)*2.0 + 1.0;
            vec4 sh = -step(h, vec4(0.0));
            
            vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
            vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
            
            vec3 p0 = vec3(a0.xy, h.x);
            vec3 p1 = vec3(a0.zw, h.y);
            vec3 p2 = vec3(a1.xy, h.z);
            vec3 p3 = vec3(a1.zw, h.w);
            
            vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
            p0 *= norm.x;
            p1 *= norm.y;
            p2 *= norm.z;
            p3 *= norm.w;
            
            vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
            m = m * m;
            return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
        }
        
        // Fractal Brownian Motion for more complex flames
        float fbm(vec3 p) {
            float value = 0.0;
            float amplitude = 0.5;
            float frequency = 1.0;
            
            for (int i = 0; i < 4; i++) {
                value += amplitude * snoise(p * frequency);
                amplitude *= 0.5;
                frequency *= 2.0;
            }
            return value;
        }
        
        void main() {
            // Calculate distance from sun center
            vec3 toSurface = vWorldPosition - uSunCenter;
            float dist = length(toSurface);
            vec3 dir = normalize(toSurface);
            
            // Normalized distance from surface (0 at surface, 1 at edge of corona)
            float coronaSize = uSunRadius * 1.8;
            float normalizedDist = (dist - uSunRadius) / (coronaSize - uSunRadius);
            normalizedDist = clamp(normalizedDist, 0.0, 1.0);
            
            // Skip if inside the sun sphere
            if (dist < uSunRadius * 0.98) {
                discard;
            }
            
            // Animated flame noise
            vec3 noiseCoord = dir * 3.0 + vec3(0.0, uTime * 0.3, uTime * 0.2);
            float flameNoise = fbm(noiseCoord);
            
            // Secondary faster-moving flames
            vec3 noiseCoord2 = dir * 5.0 + vec3(uTime * 0.5, 0.0, uTime * 0.4);
            float flameNoise2 = fbm(noiseCoord2) * 0.5;
            
            // Combine flame effects
            float flames = flameNoise + flameNoise2;
            flames = flames * 0.5 + 0.5; // Normalize to 0-1
            
            // Corona intensity - brighter near surface, fading outward
            float baseIntensity = 1.0 - normalizedDist;
            baseIntensity = pow(baseIntensity, 1.5);
            
            // Add flame variation
            float finalIntensity = baseIntensity * (0.7 + flames * 0.5);
            
            // Corona colors - from white-yellow at center to orange-red at edges
            vec3 innerColor = vec3(1.0, 0.95, 0.8);  // Hot white-yellow
            vec3 midColor = vec3(1.0, 0.7, 0.2);     // Orange
            vec3 outerColor = vec3(0.9, 0.3, 0.1);   // Red
            
            vec3 coronaColor;
            if (normalizedDist < 0.3) {
                coronaColor = mix(innerColor, midColor, normalizedDist / 0.3);
            } else {
                coronaColor = mix(midColor, outerColor, (normalizedDist - 0.3) / 0.7);
            }
            
            // Add bright flame prominences
            float prominence = max(0.0, flames - 0.6) * 3.0;
            finalIntensity += prominence * baseIntensity;
            
            // Final color with alpha for blending
            float alpha = finalIntensity * 0.8;
            alpha = clamp(alpha, 0.0, 1.0);
            
            gl_FragColor = vec4(coronaColor * finalIntensity * 1.5, alpha);
        }
