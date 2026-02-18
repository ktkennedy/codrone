/**
 * Wind Models for Drone Simulator
 * Ported from rotorpy (dryden_utils.py) to JavaScript
 *
 * Coordinate system: Three.js Y-up (X: right, Y: up, -Z: forward)
 * Physics runs at 250Hz (dt = 0.004s)
 *
 * All models expose: update(t, dt) -> [wx, wy, wz] in world frame
 */

(function() {
    'use strict';

    // -------------------------------------------------------------------------
    // NoWind
    // -------------------------------------------------------------------------
    function NoWind() {}

    NoWind.prototype.update = function(t, dt) {
        return [0, 0, 0];
    };

    // -------------------------------------------------------------------------
    // ConstantWind
    // -------------------------------------------------------------------------
    function ConstantWind(wx, wy, wz) {
        this.wx = wx || 0;
        this.wy = wy || 0;
        this.wz = wz || 0;
    }

    ConstantWind.prototype.update = function(t, dt) {
        return [this.wx, this.wy, this.wz];
    };

    // -------------------------------------------------------------------------
    // SinusoidWind
    // Each axis: w_i(t) = A_i * sin(2pi * f_i * (t + phase_i))
    // amplitudes, frequencies, phases are arrays of length 3 [x, y, z]
    // -------------------------------------------------------------------------
    function SinusoidWind(amplitudes, frequencies, phases) {
        this.amplitudes  = amplitudes  || [1, 0, 0];
        this.frequencies = frequencies || [0.5, 0.5, 0.5];
        this.phases      = phases      || [0, 0, 0];
    }

    SinusoidWind.prototype.update = function(t, dt) {
        var TWO_PI = 2 * Math.PI;
        var wx = this.amplitudes[0] * Math.sin(TWO_PI * this.frequencies[0] * (t + this.phases[0]));
        var wy = this.amplitudes[1] * Math.sin(TWO_PI * this.frequencies[1] * (t + this.phases[1]));
        var wz = this.amplitudes[2] * Math.sin(TWO_PI * this.frequencies[2] * (t + this.phases[2]));
        return [wx, wy, wz];
    };

    // -------------------------------------------------------------------------
    // DrydenGustModel  (GustModelBase from rotorpy/dryden_utils.py)
    //
    // Second-order IIR filter driven by uniform white noise.
    //   b = 2*sqrt(3)*L/V
    //   c = 2*L/V
    //   alpha = sigma * sqrt(2*L / (pi*V))
    //   beta  = alpha * b
    //   delta = 2*c
    //   gamma = c*c
    //
    // Difference equation (per step dt):
    //   C1 = 1 + 2*delta/dt + 4*gamma/dt^2
    //   C2 = 2 - 8*gamma/dt^2
    //   C3 = 1 - 2*delta/dt + 4*gamma/dt^2
    //   C4 = alpha + 2*beta/dt
    //   C5 = 2*alpha
    //   C6 = alpha - 2*beta/dt
    //   y_k = (C4*u_k + C5*u_km1 + C6*u_km2 - C2*y_km1 - C3*y_km2) / C1
    // -------------------------------------------------------------------------
    function DrydenGustModel(V, L, sigma) {
        V     = V     || 1.0;
        L     = L     || 1.0;
        sigma = sigma || 1.0;

        var b = 2 * Math.sqrt(3) * L / V;
        var c = 2 * L / V;

        this.alpha = sigma * Math.sqrt(2 * L / (Math.PI * V));
        this.beta  = this.alpha * b;
        this.delta = 2 * c;
        this.gamma = c * c;

        this.u_km1 = 0;
        this.u_km2 = 0;
        this.y_km1 = 0;
        this.y_km2 = 0;
    }

    DrydenGustModel.prototype.run = function(dt) {
        var C1 = 1.0 + 2 * this.delta / dt + 4 * this.gamma / (dt * dt);
        var C2 = 2.0 - 8 * this.gamma / (dt * dt);
        var C3 = 1.0 - 2 * this.delta / dt + 4 * this.gamma / (dt * dt);
        var C4 = this.alpha + 2 * this.beta / dt;
        var C5 = 2 * this.alpha;
        var C6 = this.alpha - 2 * this.beta / dt;

        var u_k = Math.random() * 2 - 1;

        var y_k = (C4 * u_k + C5 * this.u_km1 + C6 * this.u_km2
                   - C2 * this.y_km1 - C3 * this.y_km2) / C1;

        this.u_km2 = this.u_km1;
        this.u_km1 = u_k;
        this.y_km2 = this.y_km1;
        this.y_km1 = y_k;

        return y_k;
    };

    DrydenGustModel.prototype.integrate = DrydenGustModel.prototype.run;

    // -------------------------------------------------------------------------
    // DrydenWind
    // config = {
    //   wx_nominal, wy_nominal, wz_nominal,
    //   wx_sigma, wy_sigma, wz_sigma,
    //   altitude  (metres AGL, default 2.0)
    // }
    // -------------------------------------------------------------------------
    function DrydenWind(config) {
        config = config || {};

        this.wx_nominal = config.wx_nominal || 0;
        this.wy_nominal = config.wy_nominal || 0;
        this.wz_nominal = config.wz_nominal || 0;

        var wx_sigma = config.wx_sigma || 1.0;
        var wy_sigma = config.wy_sigma || 1.0;
        var wz_sigma = config.wz_sigma || 1.0;
        var altitude = config.altitude  || 2.0;

        // MIL-HDBK-1797B: altitude-dependent spatial scale lengths
        var Lz_ft = 3.281 * altitude;
        var Lx_ft = Lz_ft / Math.pow(0.177 + 0.000823 * Lz_ft, 1.2);
        var Ly_ft = Lx_ft;

        var Lx = Lx_ft / 3.281;
        var Ly = Ly_ft / 3.281;
        var Lz = Lz_ft / 3.281;

        this.gust_x = new DrydenGustModel(1.0, Lx, wx_sigma);
        this.gust_y = new DrydenGustModel(1.0, Ly, wy_sigma);
        this.gust_z = new DrydenGustModel(1.0, Lz, wz_sigma);
    }

    DrydenWind.prototype.update = function(t, dt) {
        var gx = this.gust_x.integrate(dt);
        var gy = this.gust_y.integrate(dt);
        var gz = this.gust_z.integrate(dt);
        return [
            this.wx_nominal + gx,
            this.wy_nominal + gy,
            this.wz_nominal + gz
        ];
    };

    // -------------------------------------------------------------------------
    // DrydenWindLP  (DrydenWind + first-order low-pass smoother)
    // w_filtered = (1 - dt/tau) * w_prev + (dt/tau) * w_raw
    // -------------------------------------------------------------------------
    function DrydenWindLP(config, tau) {
        DrydenWind.call(this, config);
        this.tau    = tau || 0.2;
        this.w_prev = [0, 0, 0];
    }

    DrydenWindLP.prototype = Object.create(DrydenWind.prototype);
    DrydenWindLP.prototype.constructor = DrydenWindLP;

    DrydenWindLP.prototype.update = function(t, dt) {
        var raw = DrydenWind.prototype.update.call(this, t, dt);
        var alpha = dt / this.tau;
        if (alpha > 1) alpha = 1;
        var filtered = [
            (1 - alpha) * this.w_prev[0] + alpha * raw[0],
            (1 - alpha) * this.w_prev[1] + alpha * raw[1],
            (1 - alpha) * this.w_prev[2] + alpha * raw[2]
        ];
        this.w_prev = filtered;
        return filtered;
    };

    // -------------------------------------------------------------------------
    // CompositeWind  - sums the outputs of multiple wind models
    // -------------------------------------------------------------------------
    function CompositeWind(winds) {
        this.winds = winds || [];
    }

    CompositeWind.prototype.update = function(t, dt) {
        var wx = 0, wy = 0, wz = 0;
        for (var i = 0; i < this.winds.length; i++) {
            var w = this.winds[i].update(t, dt);
            wx += w[0];
            wy += w[1];
            wz += w[2];
        }
        return [wx, wy, wz];
    };

    // -------------------------------------------------------------------------
    // WindPresets - 미리 정의된 바람 조건
    // -------------------------------------------------------------------------
    var WindPresets = {

        calm: function() {
            return new NoWind();
        },

        light: function() {
            return new CompositeWind([
                new ConstantWind(1.5, 0, 0.5),
                new DrydenWindLP(
                    { wx_sigma: 0.5, wy_sigma: 0.3, wz_sigma: 0.5, altitude: 2.0 },
                    0.2
                )
            ]);
        },

        moderate: function() {
            return new CompositeWind([
                new ConstantWind(3, 0, 1),
                new DrydenWindLP(
                    { wx_sigma: 1.5, wy_sigma: 1.0, wz_sigma: 1.5, altitude: 2.0 },
                    0.15
                )
            ]);
        },

        strong: function() {
            return new CompositeWind([
                new ConstantWind(5, -0.5, 2),
                new DrydenWindLP(
                    { wx_sigma: 3.0, wy_sigma: 2.0, wz_sigma: 3.0, altitude: 2.0 },
                    0.1
                )
            ]);
        },

        gusty: function() {
            return new CompositeWind([
                new ConstantWind(1, 0, 0.5),
                new DrydenWindLP(
                    { wx_sigma: 5.0, wy_sigma: 3.0, wz_sigma: 5.0, altitude: 2.0 },
                    0.15
                )
            ]);
        },

        sinusoid: function() {
            return new SinusoidWind(
                [2.0, 0.3, 1.0],
                [0.2, 0.1, 0.15],
                [0.0, 1.5, 0.8]
            );
        }
    };

    // -------------------------------------------------------------------------
    // Register to global DroneSim namespace
    // -------------------------------------------------------------------------
    window.DroneSim = window.DroneSim || {};

    window.DroneSim.NoWind          = NoWind;
    window.DroneSim.ConstantWind    = ConstantWind;
    window.DroneSim.SinusoidWind    = SinusoidWind;
    window.DroneSim.DrydenGustModel = DrydenGustModel;
    window.DroneSim.DrydenWind      = DrydenWind;
    window.DroneSim.DrydenWindLP    = DrydenWindLP;
    window.DroneSim.CompositeWind   = CompositeWind;
    window.DroneSim.WindPresets     = WindPresets;

})();
