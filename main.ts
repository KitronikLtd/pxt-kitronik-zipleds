 /**
 * Kitronik ZIP LEDS blocks
 **/
 namespace kitronik_zipleds{

    export enum ZipLedColors {
            //% block=red
            Red = 0xFF0000,
            //% block=orange
            Orange = 0xFFA500,
            //% block=yellow
            Yellow = 0xFFFF00,
            //% block=green
            Green = 0x00FF00,
            //% block=blue
            Blue = 0x0000FF,
            //% block=indigo
            Indigo = 0x4b0082,
            //% block=violet
            Violet = 0x8a2be2,
            //% block=purple
            Purple = 0xFF00FF,
            White = 0xFFFFFF,
            //% block=black
            Black = 0x000000
        }

    export class ZipLED {
        buf: Buffer;
        pin: DigitalPin;
        brightness: number;
        start: number;
        _length: number;


        /**
         * Shows a rainbow pattern on all LEDs. 
         * @param startHue the start hue value for the rainbow, eg: 1
         * @param endHue the end hue value for the rainbow, eg: 360
         */
        showRainbow(startHue: number = 1, endHue: number = 360) {
            if (this._length <= 0) return;

            startHue = startHue >> 0;
            endHue = endHue >> 0;
            const saturation = 100;
            const luminance = 50;
            const steps = this._length;
            const direction = HueInterpolationDirection.Clockwise;

            //hue
            const h1 = startHue;
            const h2 = endHue;
            const hDistCW = ((h2 + 360) - h1) % 360;
            const hStepCW = Math.idiv((hDistCW * 100), steps);
            const hDistCCW = ((h1 + 360) - h2) % 360;
            const hStepCCW = Math.idiv(-(hDistCCW * 100), steps);
            let hStep: number;
            if (direction === HueInterpolationDirection.Clockwise) {
                hStep = hStepCW;
            } else if (direction === HueInterpolationDirection.CounterClockwise) {
                hStep = hStepCCW;
            } else {
                hStep = hDistCW < hDistCCW ? hStepCW : hStepCCW;
            }
            const h1_100 = h1 * 100; //we multiply by 100 so we keep more accurate results while doing interpolation

            //sat
            const s1 = saturation;
            const s2 = saturation;
            const sDist = s2 - s1;
            const sStep = Math.idiv(sDist, steps);
            const s1_100 = s1 * 100;

            //lum
            const l1 = luminance;
            const l2 = luminance;
            const lDist = l2 - l1;
            const lStep = Math.idiv(lDist, steps);
            const l1_100 = l1 * 100

            //interpolate
            if (steps === 1) {
                this.setPixelRGB(0, hsl(h1 + hStep, s1 + sStep, l1 + lStep))
            } else {
                this.setPixelRGB(0, hsl(startHue, saturation, luminance));
                for (let i = 1; i < steps - 1; i++) {
                    const h = Math.idiv((h1_100 + i * hStep), 100) + 360;
                    const s = Math.idiv((s1_100 + i * sStep), 100);
                    const l = Math.idiv((l1_100 + i * lStep), 100);
                    this.setPixelRGB(i, hsl(h, s, l));
                }
                this.setPixelRGB(steps - 1, hsl(endHue, saturation, luminance));
            }
            this.show();
        }

		 //
         // Displays a vertical bar graph based on the `value` and `high` value.
         // If `high` is 0, the chart gets adjusted automatically.
         // @param value current value to plot
         // @param high maximum value, eg: 255
         //
        showBarGraph(value: number, high: number): void {
            if (high <= 0) {
                this.clear();
                this.setPixelRGB(0, 0xFFFF00);
                this.show();
                return;
            }

            value = Math.abs(value);
            const n = this._length;
            const n1 = n - 1;
            let v = Math.idiv((value * n), high);
            if (v == 0) {
                this.setPixelRGB(0, 0x666600);
                for (let j = 1; j < n; ++j)
                    this.setPixelRGB(j, 0);
            } else {
                for (let k = 0; k < n; ++k) {
                    if (k <= v) {
                        const g = Math.idiv(k * 255, n1);
                        //this.setPixelRGB(i, zipLEDs.rgb(0, g, 255 - g));
                        this.setPixelRGB(k, rgb(g, 255 - g, 0));
                    }
                    else this.setPixelRGB(k, 0);
                }
            }
            this.show();
        }

        //
        // Rotate LEDs forward.
        // You need to call ``show`` to make the changes visible.
        // @param offset number of ZIP LEDs to rotate forward, eg: 1
        //
        rotate(offset: number = 1): void {
            this.buf.rotate(-offset * 3, this.start * 3, this._length * 3)
        }
        
    	//
        // Sets whole ZIP LEDs as a given color (range 0-255 for r, g, b). Call Show to make changes visible 
        // @param rgb RGB color of the LED
        //
        setColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
        }
    	//
        // Shows whole ZIP LEDs as a given color (range 0-255 for r, g, b). 
        // @param rgb RGB color of the LED
        //
        showColor(rgb: number) {
            rgb = rgb >> 0;
            this.setAllRGB(rgb);
            this.show();
        }

        //
        // Set particular ZIP LED on the board to a given color. 
        // You need to call ``show changes`` to make the changes visible.
        // @param zipLedNum position of the ZIP LED in the string
        // @param rgb RGB color of the ZIP LED
        //
        setZipLedColor(zipLedNum: number, rgb: number): void {
            this.setPixelRGB(zipLedNum >> 0, rgb >> 0);
        }

        show() {
            //use the Kitronik version which respects brightness for all 
            ws2812b.sendBuffer(this.buf, this.pin, this.brightness);
        }

        //
        // Turn off all LEDs on the ZIP LEDs.
        // You need to call ``show`` to make the changes visible.
        //
        clear(): void {
            this.buf.fill(0, this.start * 3, this._length * 3);
        }

        //
        // Set the brightness of all the ZIP LEDs. This flag only applies to future show operation.
        // @param brightness a measure of LED brightness in 0-255. eg: 255
        //
        setBrightness(brightness: number): void {
            //Clamp incoming variable at 0-255 as values out of this range cause unexpected brightnesses as the lower level code only expects a byte.
            if (brightness < 0) {
                brightness = 0
            }
            else if (brightness > 255) {
                brightness = 255
            }
            this.brightness = brightness & 0xff;
            basic.pause(1) //add a pause to stop wierdnesses
        }

        //Sets up the buffer for pushing LED control data out to LEDs
        private setBufferRGB(offset: number, red: number, green: number, blue: number): void {
            this.buf[offset + 0] = green;
            this.buf[offset + 1] = red;
            this.buf[offset + 2] = blue;
        }

        //Separates out Red, Green and Blue data and fills the LED control data buffer for all LEDs
        private setAllRGB(rgb: number) {
            let red = unpackR(rgb);
            let green = unpackG(rgb);
            let blue = unpackB(rgb);

            const end = this.start + this._length;
            for (let m = this.start; m < end; ++m) {
                this.setBufferRGB(m * 3, red, green, blue)
            }
        }

        //Separates out Red, Green and Blue data and fills the LED control data buffer for a single LED
        private setPixelRGB(pixeloffset: number, rgb: number): void {
            if (pixeloffset < 0
                || pixeloffset >= this._length)
                return;

            pixeloffset = (pixeloffset + this.start) * 3;

            let red2 = unpackR(rgb);
            let green2 = unpackG(rgb);
            let blue2 = unpackB(rgb);

            this.setBufferRGB(pixeloffset, red2, green2, blue2)
        }
    }

    /*  The LEDs we are using have centre wavelengths of 470nm (Blue) 525nm(Green) and 625nm (Red) 
    * 	 We blend these linearly to give the impression of the other wavelengths. 
    *   as we cant wavelength shift an actual LED... (Ye canna change the laws of physics Capt)*/

    //
    // Converts value to red, green, blue channels
    // @param red value of the red channel between 0 and 255. eg: 255
    // @param green value of the green channel between 0 and 255. eg: 255
    // @param blue value of the blue channel between 0 and 255. eg: 255
    //
    export function rgb(red: number, green: number, blue: number): number {
        return packRGB(red, green, blue);
    }

    //
    // Gets the RGB value of a known color
    //
    export function colors(color: ZipLedColors): number {
        return color;
    }

    //Combines individual RGB settings to be a single number
    function packRGB(a: number, b: number, c: number): number {
        return ((a & 0xFF) << 16) | ((b & 0xFF) << 8) | (c & 0xFF);
    }
    //Separates red value from combined number
    function unpackR(rgb: number): number {
        let r = (rgb >> 16) & 0xFF;
        return r;
    }
    //Separates green value from combined number
    function unpackG(rgb: number): number {
        let o = (rgb >> 8) & 0xFF;
        return o;
    }
    //Separates blue value from combined number
    function unpackB(rgb: number): number {
        let b = (rgb) & 0xFF;
        return b;
    }

    //
    // Converts a hue saturation luminosity value into a RGB color
    //
    function hsl(h: number, s: number, l: number): number {
        h = Math.round(h);
        s = Math.round(s);
        l = Math.round(l);

        h = h % 360;
        s = Math.clamp(0, 99, s);
        l = Math.clamp(0, 99, l);
        let c = Math.idiv((((100 - Math.abs(2 * l - 100)) * s) << 8), 10000); //chroma, [0,255]
        let h12 = Math.idiv(h, 60);//[0,6]
        let h22 = Math.idiv((h - h12 * 60) * 256, 60);//[0,255]
        let temp = Math.abs((((h12 % 2) << 8) + h22) - 256);
        let x = (c * (256 - (temp))) >> 8;//[0,255], second largest component of this color
        let r$: number;
        let g$: number;
        let b$: number;
        if (h12 == 0) {
            r$ = c; g$ = x; b$ = 0;
        } else if (h12 == 1) {
            r$ = x; g$ = c; b$ = 0;
        } else if (h12 == 2) {
            r$ = 0; g$ = c; b$ = x;
        } else if (h12 == 3) {
            r$ = 0; g$ = x; b$ = c;
        } else if (h12 == 4) {
            r$ = x; g$ = 0; b$ = c;
        } else if (h12 == 5) {
            r$ = c; g$ = 0; b$ = x;
        }
        let p = Math.idiv((Math.idiv((l * 2 << 8), 100) - c), 2);
        let t = r$ + p;
        let q = g$ + p;
        let d = b$ + p;
        return packRGB(t, q, d);
    }

    //
    // Options for direction hue changes, used by rainbow block (never visible to end user)
    //
    export enum HueInterpolationDirection {
        Clockwise,
        CounterClockwise,
        Shortest
    }
 }