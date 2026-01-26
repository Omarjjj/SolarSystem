precision mediump float;
        
        uniform sampler2D uTexture;
        uniform float uThreshold;
        
        varying vec2 vTexCoord;
        
        void main() {
            vec4 color = texture2D(uTexture, vTexCoord);
            float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
            
            if (brightness > uThreshold) {
                gl_FragColor = color;
            } else {
                gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
            }
        }
