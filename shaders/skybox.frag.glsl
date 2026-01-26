precision mediump float;
        
        uniform sampler2D uSkyboxTexture;
        varying vec2 vTexCoord;
        
        void main() {
            gl_FragColor = texture2D(uSkyboxTexture, vTexCoord);
        }
