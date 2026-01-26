precision mediump float;
        
        varying float vBrightness;
        
        void main() {
            vec2 center = gl_PointCoord - vec2(0.5);
            float dist = length(center);
            if (dist > 0.5) discard;
            
            float intensity = (1.0 - dist * 2.0) * vBrightness;
            intensity = pow(intensity, 0.8);
            gl_FragColor = vec4(vec3(intensity), 1.0);
        }
