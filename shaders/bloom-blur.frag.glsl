precision mediump float;
        
        uniform sampler2D uTexture;
        uniform vec2 uDirection;
        uniform vec2 uResolution;
        
        varying vec2 vTexCoord;
        
        void main() {
            vec2 texelSize = 1.0 / uResolution;
            vec4 result = vec4(0.0);
            
            float weights[5];
            weights[0] = 0.227027;
            weights[1] = 0.1945946;
            weights[2] = 0.1216216;
            weights[3] = 0.054054;
            weights[4] = 0.016216;
            
            result += texture2D(uTexture, vTexCoord) * weights[0];
            
            for (int i = 1; i < 5; i++) {
                vec2 offset = uDirection * texelSize * float(i);
                result += texture2D(uTexture, vTexCoord + offset) * weights[i];
                result += texture2D(uTexture, vTexCoord - offset) * weights[i];
            }
            
            gl_FragColor = result;
        }
