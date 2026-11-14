"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/rl/server.ts
var server_exports = {};
__export(server_exports, {
  PROTOCOL: () => PROTOCOL
});
module.exports = __toCommonJS(server_exports);
var import_node_fs = require("node:fs");
var import_node_path = require("node:path");

// src/physics/b2/trig.ts
var view = new DataView(new ArrayBuffer(8));
function dbl(hi, lo) {
  view.setUint32(0, hi);
  view.setUint32(4, lo);
  return view.getFloat64(0);
}
var INV_PIO2 = dbl(1071931184, 1841940611);
var PIO2_1 = dbl(1073291771, 1413480448);
var PIO2_1T = dbl(1037087841, 442655537);
var PIO2_2 = dbl(1037087841, 442499072);
var PIO2_2T = dbl(1000544650, 771977331);
var PIO2_3 = dbl(1000544650, 771751936);
var PIO2_3T = dbl(964395930, 622873025);
var S1 = dbl(3217380693, 1431655753);
var S2 = dbl(1065423121, 286324902);
var S3 = dbl(3207201184, 432103893);
var S4 = dbl(1053236707, 1471282813);
var S5 = dbl(3193628134, 2318114027);
var S6 = dbl(1038473530, 1523570044);
var C1 = dbl(1067799893, 1431655756);
var C2 = dbl(3210133868, 381768055);
var C3 = dbl(1056571808, 432739728);
var C4 = dbl(3197271631, 2157728429);
var C5 = dbl(1042411166, 3182735812);
var C6 = dbl(3181968105, 3196598484);
var REDUCE_ABOVE = 5e5;
var TWO_PI = 6.283185307179586;
var bits = view;
function highWord(x) {
  bits.setFloat64(0, x);
  return bits.getUint32(0);
}
function exponentOf(x) {
  return highWord(x) >>> 20 & 2047;
}
function quarterTruncated(x) {
  bits.setFloat64(0, x);
  const hi = bits.getUint32(0) - 2097152;
  bits.setUint32(0, hi >>> 0);
  bits.setUint32(4, 0);
  return bits.getFloat64(0);
}
function kernelSin(x, y, tailed) {
  const z = x * x;
  const v = z * x;
  const r = S2 + z * (S3 + z * (S4 + z * (S5 + z * S6)));
  if (!tailed) return x + v * (S1 + z * r);
  return x - (z * (0.5 * y - v * r) - y - v * S1);
}
function kernelCos(x, y) {
  const z = x * x;
  const r = z * (C1 + z * (C2 + z * (C3 + z * (C4 + z * (C5 + z * C6)))));
  const ax = x < 0 ? -x : x;
  if (ax < 0.3) return 1 - (0.5 * z - (z * r - x * y));
  const qx = ax > 0.78125 ? 0.28125 : quarterTruncated(ax);
  const hz = 0.5 * z - qx;
  const a = 1 - qx;
  return a - (hz - (z * r - x * y));
}
function sincos(x, out) {
  if (!(x > -REDUCE_ABOVE && x < REDUCE_ABOVE)) {
    x = x % TWO_PI;
    if (x !== x) {
      out.sin = NaN;
      out.cos = NaN;
      return;
    }
  }
  const t = x < 0 ? -x : x;
  if (t <= 0.7853981633974483) {
    out.sin = kernelSin(x, 0, false);
    out.cos = kernelCos(x, 0);
    return;
  }
  const n = Math.floor(t * INV_PIO2 + 0.5);
  let r = t - n * PIO2_1;
  let w = n * PIO2_1T;
  let y0 = r - w;
  const j = exponentOf(t);
  if (j - exponentOf(y0) > 16) {
    let u = r;
    w = n * PIO2_2;
    r = u - w;
    w = n * PIO2_2T - (u - r - w);
    y0 = r - w;
    if (j - exponentOf(y0) > 49) {
      u = r;
      w = n * PIO2_3;
      r = u - w;
      w = n * PIO2_3T - (u - r - w);
      y0 = r - w;
    }
  }
  let y1 = r - y0 - w;
  let q = n;
  if (x < 0) {
    y0 = -y0;
    y1 = -y1;
    q = -n;
  }
  const s = kernelSin(y0, y1, true);
  const c = kernelCos(y0, y1);
  switch (q & 3) {
    case 0:
      out.sin = s;
      out.cos = c;
      break;
    case 1:
      out.sin = c;
      out.cos = -s;
      break;
    case 2:
      out.sin = -s;
      out.cos = -c;
      break;
    default:
      out.sin = -c;
      out.cos = s;
      break;
  }
}

// src/physics/b2/math.ts
var trig = { sin: 0, cos: 0 };
var Vec2 = class _Vec2 {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }
  set(x, y) {
    this.x = x;
    this.y = y;
  }
  setV(v) {
    this.x = v.x;
    this.y = v.y;
  }
  setZero() {
    this.x = 0;
    this.y = 0;
  }
  copy() {
    return new _Vec2(this.x, this.y);
  }
  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }
  length() {
    return Math.sqrt(this.lengthSquared());
  }
  normalize() {
    const len = this.length();
    if (len < Number.MIN_VALUE) return 0;
    const inv = 1 / len;
    this.x *= inv;
    this.y *= inv;
    return len;
  }
  multiply(a) {
    this.x *= a;
    this.y *= a;
  }
};
var Mat22 = class {
  col1 = new Vec2();
  col2 = new Vec2();
  /** b2Mat22.Set(angle): column-major rotation. */
  setAngle(angle) {
    sincos(angle, trig);
    const c = trig.cos;
    const s = trig.sin;
    this.col1.x = c;
    this.col2.x = -s;
    this.col1.y = s;
    this.col2.y = c;
  }
  setM(m) {
    this.col1.setV(m.col1);
    this.col2.setV(m.col2);
  }
  addM(m) {
    this.col1.x += m.col1.x;
    this.col1.y += m.col1.y;
    this.col2.x += m.col2.x;
    this.col2.y += m.col2.y;
  }
  /** b2Mat22.Solve — writes into `out`. */
  solve(out, bx, by) {
    const a11 = this.col1.x, a12 = this.col2.x;
    const a21 = this.col1.y, a22 = this.col2.y;
    let det = a11 * a22 - a12 * a21;
    det = 1 / det;
    out.x = det * (a22 * bx - a12 * by);
    out.y = det * (a11 * by - a21 * bx);
    return out;
  }
  getInverse(out) {
    const a = this.col1.x, b = this.col2.x, c = this.col1.y, d = this.col2.y;
    let det = a * d - b * c;
    det = 1 / det;
    out.col1.x = det * d;
    out.col2.x = -det * b;
    out.col1.y = -det * c;
    out.col2.y = det * a;
  }
};
var Vec3 = class {
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  setZero() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
  }
  add(v) {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
  }
};
var Mat33 = class {
  col1 = new Vec3();
  col2 = new Vec3();
  col3 = new Vec3();
  solve22(out, bx, by) {
    const a11 = this.col1.x, a12 = this.col2.x;
    const a21 = this.col1.y, a22 = this.col2.y;
    let det = a11 * a22 - a12 * a21;
    det = 1 / det;
    out.x = det * (a22 * bx - a12 * by);
    out.y = det * (a11 * by - a21 * bx);
    return out;
  }
  solve33(out, bx, by, bz) {
    const a1x = this.col1.x, a1y = this.col1.y, a1z = this.col1.z;
    const a2x = this.col2.x, a2y = this.col2.y, a2z = this.col2.z;
    const a3x = this.col3.x, a3y = this.col3.y, a3z = this.col3.z;
    let det = a1x * (a2y * a3z - a2z * a3y) + a1y * (a2z * a3x - a2x * a3z) + a1z * (a2x * a3y - a2y * a3x);
    det = 1 / det;
    out.x = det * (bx * (a2y * a3z - a2z * a3y) + by * (a2z * a3x - a2x * a3z) + bz * (a2x * a3y - a2y * a3x));
    out.y = det * (a1x * (by * a3z - bz * a3y) + a1y * (bz * a3x - bx * a3z) + a1z * (bx * a3y - by * a3x));
    out.z = det * (a1x * (a2y * bz - a2z * by) + a1y * (a2z * bx - a2x * bz) + a1z * (a2x * by - a2y * bx));
    return out;
  }
};
var XForm = class {
  position = new Vec2();
  R = new Mat22();
  set(other) {
    this.position.setV(other.position);
    this.R.setM(other.R);
  }
};
var Sweep = class {
  localCenter = new Vec2();
  c0 = new Vec2();
  c = new Vec2();
  a0 = 0;
  a = 0;
  /** Time of the c0/a0 sample within the current step, in [0, 1]. */
  t0 = 0;
  /** b2Sweep.GetXForm — the body's transform at time `t` of the sweep. */
  getXForm(xf, t) {
    if (1 - this.t0 > Number.MIN_VALUE) {
      const alpha = (t - this.t0) / (1 - this.t0);
      xf.position.x = (1 - alpha) * this.c0.x + alpha * this.c.x;
      xf.position.y = (1 - alpha) * this.c0.y + alpha * this.c.y;
      xf.R.setAngle((1 - alpha) * this.a0 + alpha * this.a);
    } else {
      xf.position.setV(this.c);
      xf.R.setAngle(this.a);
    }
    const R = xf.R;
    xf.position.x -= R.col1.x * this.localCenter.x + R.col2.x * this.localCenter.y;
    xf.position.y -= R.col1.y * this.localCenter.x + R.col2.y * this.localCenter.y;
  }
  /** b2Sweep.Advance — moves the c0/a0 sample forward to time `t`. */
  advance(t) {
    if (this.t0 < t && 1 - this.t0 > Number.MIN_VALUE) {
      const alpha = (t - this.t0) / (1 - this.t0);
      this.c0.x = (1 - alpha) * this.c0.x + alpha * this.c.x;
      this.c0.y = (1 - alpha) * this.c0.y + alpha * this.c.y;
      this.a0 = (1 - alpha) * this.a0 + alpha * this.a;
      this.t0 = t;
    }
  }
};
var clamp = (v, lo, hi) => v < lo ? lo : v > hi ? hi : v;

// src/physics/b2/body.ts
var Body = class {
  xf = new XForm();
  sweep = new Sweep();
  linearVelocity = new Vec2();
  angularVelocity = 0;
  force = new Vec2();
  torque = 0;
  mass = 0;
  invMass = 0;
  I = 0;
  invI = 0;
  fixedRotation;
  allowSleep;
  sleeping = false;
  sleepTime = 0;
  /** 2.0.2 decides this in SetMassFromShapes: zero mass AND zero inertia. */
  isStatic = true;
  shapes = [];
  userData;
  /** Bodies joined to this one with collideConnected = false. */
  connected = /* @__PURE__ */ new Set();
  /** Scratch flag used while building solver islands. */
  islandFlag = false;
  constructor(def) {
    this.fixedRotation = def.fixedRotation ?? false;
    this.allowSleep = def.allowSleep ?? true;
    this.userData = def.userData;
    const angle = def.angle ?? 0;
    this.xf.position.set(def.x, def.y);
    this.xf.R.setAngle(angle);
    this.sweep.a0 = angle;
    this.sweep.a = angle;
    this.sweep.c.set(def.x, def.y);
    this.sweep.c0.set(def.x, def.y);
  }
  createShape(shape) {
    shape.body = this;
    this.shapes.push(shape);
    return shape;
  }
  captureState() {
    const R = this.xf.R;
    const s = this.sweep;
    return {
      px: this.xf.position.x,
      py: this.xf.position.y,
      r1x: R.col1.x,
      r1y: R.col1.y,
      r2x: R.col2.x,
      r2y: R.col2.y,
      lcx: s.localCenter.x,
      lcy: s.localCenter.y,
      c0x: s.c0.x,
      c0y: s.c0.y,
      cx: s.c.x,
      cy: s.c.y,
      a0: s.a0,
      a: s.a,
      t0: s.t0,
      vx: this.linearVelocity.x,
      vy: this.linearVelocity.y,
      w: this.angularVelocity,
      fx: this.force.x,
      fy: this.force.y,
      torque: this.torque,
      mass: this.mass,
      invMass: this.invMass,
      I: this.I,
      invI: this.invI,
      sleeping: this.sleeping,
      sleepTime: this.sleepTime
    };
  }
  restoreState(b) {
    const R = this.xf.R;
    const s = this.sweep;
    this.xf.position.set(b.px, b.py);
    R.col1.set(b.r1x, b.r1y);
    R.col2.set(b.r2x, b.r2y);
    s.localCenter.set(b.lcx, b.lcy);
    s.c0.set(b.c0x, b.c0y);
    s.c.set(b.cx, b.cy);
    s.a0 = b.a0;
    s.a = b.a;
    s.t0 = b.t0;
    this.linearVelocity.set(b.vx, b.vy);
    this.angularVelocity = b.w;
    this.force.set(b.fx, b.fy);
    this.torque = b.torque;
    this.mass = b.mass;
    this.invMass = b.invMass;
    this.I = b.I;
    this.invI = b.invI;
    this.sleeping = b.sleeping;
    this.sleepTime = b.sleepTime;
  }
  /** b2Body.SetMassFromShapes. */
  setMassFromShapes() {
    this.mass = 0;
    this.invMass = 0;
    this.I = 0;
    this.invI = 0;
    let centerX = 0;
    let centerY = 0;
    const md = { mass: 0, center: new Vec2(), I: 0 };
    for (const shape of this.shapes) {
      shape.computeMass(md);
      this.mass += md.mass;
      centerX += md.mass * md.center.x;
      centerY += md.mass * md.center.y;
      this.I += md.I;
    }
    if (this.mass > 0) {
      this.invMass = 1 / this.mass;
      centerX *= this.invMass;
      centerY *= this.invMass;
    }
    if (this.I > 0 && !this.fixedRotation) {
      this.I -= this.mass * (centerX * centerX + centerY * centerY);
      this.invI = 1 / this.I;
    } else {
      this.I = 0;
      this.invI = 0;
    }
    this.sweep.localCenter.set(centerX, centerY);
    const R = this.xf.R;
    const lc = this.sweep.localCenter;
    this.sweep.c.x = this.xf.position.x + (R.col1.x * lc.x + R.col2.x * lc.y);
    this.sweep.c.y = this.xf.position.y + (R.col1.y * lc.x + R.col2.y * lc.y);
    this.sweep.c0.setV(this.sweep.c);
    const wasStatic = this.isStatic;
    this.isStatic = this.invMass === 0 && this.invI === 0;
    if (wasStatic !== this.isStatic) {
      this.linearVelocity.setZero();
      this.angularVelocity = 0;
    }
  }
  /** b2Body.SetXForm — `position` is the body ORIGIN, not the centre of mass. */
  setXForm(px, py, angle) {
    this.xf.R.setAngle(angle);
    this.xf.position.set(px, py);
    const R = this.xf.R;
    const lc = this.sweep.localCenter;
    this.sweep.c.x = px + (R.col1.x * lc.x + R.col2.x * lc.y);
    this.sweep.c.y = py + (R.col1.y * lc.x + R.col2.y * lc.y);
    this.sweep.c0.setV(this.sweep.c);
    this.sweep.a0 = angle;
    this.sweep.a = angle;
    this.wakeUp();
  }
  /** The transform at the start of the current sweep (c0 / a0). */
  sweepStartXForm(out) {
    this.sweep.getXForm(out, this.sweep.t0);
    return out;
  }
  synchronizeTransform() {
    this.xf.R.setAngle(this.sweep.a);
    const R = this.xf.R;
    const lc = this.sweep.localCenter;
    this.xf.position.x = this.sweep.c.x - (R.col1.x * lc.x + R.col2.x * lc.y);
    this.xf.position.y = this.sweep.c.y - (R.col1.y * lc.x + R.col2.y * lc.y);
  }
  getWorldCenter() {
    return this.sweep.c.copy();
  }
  getPosition() {
    return this.xf.position.copy();
  }
  getAngle() {
    return this.sweep.a;
  }
  getLinearVelocity() {
    return this.linearVelocity.copy();
  }
  getAngularVelocity() {
    return this.angularVelocity;
  }
  getUserData() {
    return this.userData;
  }
  setUserData(data) {
    this.userData = data;
  }
  setLinearVelocity(x, y) {
    if (this.isStatic) return;
    this.linearVelocity.set(x, y);
    this.wakeUp();
  }
  setAngularVelocity(w) {
    if (this.isStatic) return;
    this.angularVelocity = w;
    this.wakeUp();
  }
  /**
   * b2Body.Advance — rewinds the body to time `t` of the current step. Used by
   * SolveTOI to put a body back to the moment it first touched something.
   */
  advance(t) {
    this.sweep.advance(t);
    this.sweep.c.setV(this.sweep.c0);
    this.sweep.a = this.sweep.a0;
    this.synchronizeTransform();
  }
  wakeUp() {
    this.sleeping = false;
    this.sleepTime = 0;
  }
  putToSleep() {
    this.sleeping = true;
    this.sleepTime = 0;
    this.linearVelocity.setZero();
    this.angularVelocity = 0;
  }
};

// src/physics/b2/collision.ts
var NULL_FEATURE = 255;
var ContactID = class {
  referenceEdge = 0;
  incidentEdge = 0;
  incidentVertex = 0;
  flip = 0;
  get key() {
    return this.referenceEdge & 255 | (this.incidentEdge & 255) << 8 | (this.incidentVertex & 255) << 16 | (this.flip & 255) << 24;
  }
  setFrom(other) {
    this.referenceEdge = other.referenceEdge;
    this.incidentEdge = other.incidentEdge;
    this.incidentVertex = other.incidentVertex;
    this.flip = other.flip;
  }
};
var ManifoldPoint = class {
  localPoint1 = new Vec2();
  localPoint2 = new Vec2();
  separation = 0;
  normalImpulse = 0;
  tangentImpulse = 0;
  id = new ContactID();
  copyFrom(o) {
    this.localPoint1.setV(o.localPoint1);
    this.localPoint2.setV(o.localPoint2);
    this.separation = o.separation;
    this.normalImpulse = o.normalImpulse;
    this.tangentImpulse = o.tangentImpulse;
    this.id.setFrom(o.id);
  }
};
var Manifold = class {
  points = [new ManifoldPoint(), new ManifoldPoint()];
  normal = new Vec2();
  pointCount = 0;
  copyFrom(o) {
    this.pointCount = o.pointCount;
    this.normal.setV(o.normal);
    for (let i = 0; i < 2; i++) this.points[i].copyFrom(o.points[i]);
  }
};
var ClipVertex = class {
  v = new Vec2();
  id = new ContactID();
};
function collideCircles(m, s1, xf1, s2, xf2) {
  m.pointCount = 0;
  let R = xf1.R;
  let lp = s1.localPosition;
  let p1x = xf1.position.x + (R.col1.x * lp.x + R.col2.x * lp.y);
  let p1y = xf1.position.y + (R.col1.y * lp.x + R.col2.y * lp.y);
  R = xf2.R;
  lp = s2.localPosition;
  let p2x = xf2.position.x + (R.col1.x * lp.x + R.col2.x * lp.y);
  let p2y = xf2.position.y + (R.col1.y * lp.x + R.col2.y * lp.y);
  const dx = p2x - p1x;
  const dy = p2y - p1y;
  const distSqr = dx * dx + dy * dy;
  const r1 = s1.radius;
  const r2 = s2.radius;
  const radiusSum = r1 + r2;
  if (distSqr > radiusSum * radiusSum) return;
  let separation;
  if (distSqr < Number.MIN_VALUE) {
    separation = -radiusSum;
    m.normal.set(0, 1);
  } else {
    const dist2 = Math.sqrt(distSqr);
    separation = dist2 - radiusSum;
    const a = 1 / dist2;
    m.normal.x = a * dx;
    m.normal.y = a * dy;
  }
  m.pointCount = 1;
  const mp = m.points[0];
  mp.id.referenceEdge = 0;
  mp.id.incidentEdge = 0;
  mp.id.incidentVertex = 0;
  mp.id.flip = 0;
  mp.separation = separation;
  mp.normalImpulse = 0;
  mp.tangentImpulse = 0;
  p1x += r1 * m.normal.x;
  p1y += r1 * m.normal.y;
  p2x -= r2 * m.normal.x;
  p2y -= r2 * m.normal.y;
  writeLocalPoints(mp, 0.5 * (p1x + p2x), 0.5 * (p1y + p2y), xf1, xf2);
}
function collidePolygonAndCircle(m, poly, xf1, circle, xf2) {
  m.pointCount = 0;
  let R = xf2.R;
  const lp = circle.localPosition;
  const cWorldX = xf2.position.x + (R.col1.x * lp.x + R.col2.x * lp.y);
  const cWorldY = xf2.position.y + (R.col1.y * lp.x + R.col2.y * lp.y);
  let dx = cWorldX - xf1.position.x;
  let dy = cWorldY - xf1.position.y;
  R = xf1.R;
  const cLocalX = dx * R.col1.x + dy * R.col1.y;
  const cLocalY = dx * R.col2.x + dy * R.col2.y;
  let normalIndex = 0;
  let separation = -Number.MAX_VALUE;
  const radius = circle.radius;
  const vertexCount = poly.vertexCount;
  const vertices = poly.vertices;
  const normals = poly.normals;
  for (let i = 0; i < vertexCount; i++) {
    let v = vertices[i];
    dx = cLocalX - v.x;
    dy = cLocalY - v.y;
    v = normals[i];
    const s = v.x * dx + v.y * dy;
    if (s > radius) return;
    if (s > separation) {
      separation = s;
      normalIndex = i;
    }
  }
  const mp = m.points[0];
  if (separation < Number.MIN_VALUE) {
    m.pointCount = 1;
    const n = normals[normalIndex];
    R = xf1.R;
    m.normal.x = R.col1.x * n.x + R.col2.x * n.y;
    m.normal.y = R.col1.y * n.x + R.col2.y * n.y;
    mp.id.incidentEdge = normalIndex;
    mp.id.incidentVertex = NULL_FEATURE;
    mp.id.referenceEdge = 0;
    mp.id.flip = 0;
    writeLocalPoints(
      mp,
      cWorldX - radius * m.normal.x,
      cWorldY - radius * m.normal.y,
      xf1,
      xf2
    );
    mp.separation = separation - radius;
    mp.normalImpulse = 0;
    mp.tangentImpulse = 0;
    return;
  }
  const vertIndex1 = normalIndex;
  const vertIndex2 = vertIndex1 + 1 < vertexCount ? vertIndex1 + 1 : 0;
  const v1 = vertices[vertIndex1];
  const v2 = vertices[vertIndex2];
  let ex = v2.x - v1.x;
  let ey = v2.y - v1.y;
  const length = Math.sqrt(ex * ex + ey * ey);
  ex /= length;
  ey /= length;
  dx = cLocalX - v1.x;
  dy = cLocalY - v1.y;
  const u = dx * ex + dy * ey;
  let px;
  let py;
  if (u <= 0) {
    px = v1.x;
    py = v1.y;
    mp.id.incidentEdge = NULL_FEATURE;
    mp.id.incidentVertex = vertIndex1;
  } else if (u >= length) {
    px = v2.x;
    py = v2.y;
    mp.id.incidentEdge = NULL_FEATURE;
    mp.id.incidentVertex = vertIndex2;
  } else {
    px = ex * u + v1.x;
    py = ey * u + v1.y;
    mp.id.incidentEdge = normalIndex;
    mp.id.incidentVertex = NULL_FEATURE;
  }
  mp.id.referenceEdge = 0;
  mp.id.flip = 0;
  dx = cLocalX - px;
  dy = cLocalY - py;
  const dist2 = Math.sqrt(dx * dx + dy * dy);
  dx /= dist2;
  dy /= dist2;
  if (dist2 > radius) return;
  m.pointCount = 1;
  R = xf1.R;
  m.normal.x = R.col1.x * dx + R.col2.x * dy;
  m.normal.y = R.col1.y * dx + R.col2.y * dy;
  writeLocalPoints(
    mp,
    cWorldX - radius * m.normal.x,
    cWorldY - radius * m.normal.y,
    xf1,
    xf2
  );
  mp.separation = dist2 - radius;
  mp.normalImpulse = 0;
  mp.tangentImpulse = 0;
}
function writeLocalPoints(mp, wx, wy, xf1, xf2) {
  let tx = wx - xf1.position.x;
  let ty = wy - xf1.position.y;
  mp.localPoint1.x = tx * xf1.R.col1.x + ty * xf1.R.col1.y;
  mp.localPoint1.y = tx * xf1.R.col2.x + ty * xf1.R.col2.y;
  tx = wx - xf2.position.x;
  ty = wy - xf2.position.y;
  mp.localPoint2.x = tx * xf2.R.col1.x + ty * xf2.R.col1.y;
  mp.localPoint2.y = tx * xf2.R.col2.x + ty * xf2.R.col2.y;
}
function edgeSeparation(poly1, xf1, edge1, poly2, xf2) {
  const vertices1 = poly1.vertices;
  const normals1 = poly1.normals;
  const count2 = poly2.vertexCount;
  const vertices2 = poly2.vertices;
  let R = xf1.R;
  let v = normals1[edge1];
  const nWorldX = R.col1.x * v.x + R.col2.x * v.y;
  const nWorldY = R.col1.y * v.x + R.col2.y * v.y;
  R = xf2.R;
  const nLocal2X = R.col1.x * nWorldX + R.col1.y * nWorldY;
  const nLocal2Y = R.col2.x * nWorldX + R.col2.y * nWorldY;
  let index = 0;
  let minDot = Number.MAX_VALUE;
  for (let i = 0; i < count2; i++) {
    v = vertices2[i];
    const dot = v.x * nLocal2X + v.y * nLocal2Y;
    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }
  v = vertices1[edge1];
  R = xf1.R;
  const p1x = xf1.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  const p1y = xf1.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  v = vertices2[index];
  R = xf2.R;
  const p2x = xf2.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  const p2y = xf2.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  return (p2x - p1x) * nWorldX + (p2y - p1y) * nWorldY;
}
function findMaxSeparation(out, poly1, xf1, poly2, xf2) {
  const count1 = poly1.vertexCount;
  const normals1 = poly1.normals;
  let R = xf2.R;
  let v = poly2.centroid;
  let dx = xf2.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  let dy = xf2.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  R = xf1.R;
  v = poly1.centroid;
  dx -= xf1.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  dy -= xf1.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  const dLocalX = dx * xf1.R.col1.x + dy * xf1.R.col1.y;
  const dLocalY = dx * xf1.R.col2.x + dy * xf1.R.col2.y;
  let edge = 0;
  let maxDot = -Number.MAX_VALUE;
  for (let i = 0; i < count1; i++) {
    v = normals1[i];
    const dot = v.x * dLocalX + v.y * dLocalY;
    if (dot > maxDot) {
      maxDot = dot;
      edge = i;
    }
  }
  let s = edgeSeparation(poly1, xf1, edge, poly2, xf2);
  if (s > 0) return s;
  const prevEdge = edge - 1 >= 0 ? edge - 1 : count1 - 1;
  const sPrev = edgeSeparation(poly1, xf1, prevEdge, poly2, xf2);
  if (sPrev > 0) return sPrev;
  const nextEdge = edge + 1 < count1 ? edge + 1 : 0;
  const sNext = edgeSeparation(poly1, xf1, nextEdge, poly2, xf2);
  if (sNext > 0) return sNext;
  let bestEdge;
  let bestSeparation;
  let increment;
  if (sPrev > s && sPrev > sNext) {
    increment = -1;
    bestEdge = prevEdge;
    bestSeparation = sPrev;
  } else if (sNext > s) {
    increment = 1;
    bestEdge = nextEdge;
    bestSeparation = sNext;
  } else {
    out.edge = edge;
    return s;
  }
  for (; ; ) {
    const e = increment === -1 ? bestEdge - 1 >= 0 ? bestEdge - 1 : count1 - 1 : bestEdge + 1 < count1 ? bestEdge + 1 : 0;
    s = edgeSeparation(poly1, xf1, e, poly2, xf2);
    if (s > 0) return s;
    if (s <= bestSeparation) {
      out.edge = bestEdge;
      return bestSeparation;
    }
    bestEdge = e;
    bestSeparation = s;
  }
}
function findIncidentEdge(c, poly1, xf1, edge1, poly2, xf2) {
  const normals1 = poly1.normals;
  const count2 = poly2.vertexCount;
  const vertices2 = poly2.vertices;
  const normals2 = poly2.normals;
  let R = xf1.R;
  let v = normals1[edge1];
  let nx = R.col1.x * v.x + R.col2.x * v.y;
  let ny = R.col1.y * v.x + R.col2.y * v.y;
  R = xf2.R;
  const tX = R.col1.x * nx + R.col1.y * ny;
  ny = R.col2.x * nx + R.col2.y * ny;
  nx = tX;
  let index = 0;
  let minDot = Number.MAX_VALUE;
  for (let i = 0; i < count2; i++) {
    v = normals2[i];
    const dot = nx * v.x + ny * v.y;
    if (dot < minDot) {
      minDot = dot;
      index = i;
    }
  }
  const i1 = index;
  const i2 = i1 + 1 < count2 ? i1 + 1 : 0;
  R = xf2.R;
  v = vertices2[i1];
  c[0].v.x = xf2.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  c[0].v.y = xf2.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  c[0].id.referenceEdge = edge1;
  c[0].id.incidentEdge = i1;
  c[0].id.incidentVertex = 0;
  v = vertices2[i2];
  c[1].v.x = xf2.position.x + (R.col1.x * v.x + R.col2.x * v.y);
  c[1].v.y = xf2.position.y + (R.col1.y * v.x + R.col2.y * v.y);
  c[1].id.referenceEdge = edge1;
  c[1].id.incidentEdge = i2;
  c[1].id.incidentVertex = 1;
}
function clipSegmentToLine(vOut, vIn, nx, ny, offset) {
  let numOut = 0;
  const v0 = vIn[0].v;
  const v1 = vIn[1].v;
  const d0 = nx * v0.x + ny * v0.y - offset;
  const d1 = nx * v1.x + ny * v1.y - offset;
  if (d0 <= 0) {
    vOut[numOut].v.setV(vIn[0].v);
    vOut[numOut].id.setFrom(vIn[0].id);
    numOut++;
  }
  if (d1 <= 0) {
    vOut[numOut].v.setV(vIn[1].v);
    vOut[numOut].id.setFrom(vIn[1].id);
    numOut++;
  }
  if (d0 * d1 < 0) {
    const interp = d0 / (d0 - d1);
    vOut[numOut].v.x = v0.x + interp * (v1.x - v0.x);
    vOut[numOut].v.y = v0.y + interp * (v1.y - v0.y);
    vOut[numOut].id.setFrom(d0 > 0 ? vIn[0].id : vIn[1].id);
    numOut++;
  }
  return numOut;
}
var incidentEdgeBuf = [new ClipVertex(), new ClipVertex()];
var clip1Buf = [new ClipVertex(), new ClipVertex()];
var clip2Buf = [new ClipVertex(), new ClipVertex()];
function collidePolygons(m, polyA, xfA, polyB, xfB) {
  m.pointCount = 0;
  const outA = { edge: 0 };
  const separationA = findMaxSeparation(outA, polyA, xfA, polyB, xfB);
  if (separationA > 0) return;
  const outB = { edge: 0 };
  const separationB = findMaxSeparation(outB, polyB, xfB, polyA, xfA);
  if (separationB > 0) return;
  let poly1;
  let poly2;
  let xf1;
  let xf2;
  let edge1;
  let flip;
  const k_relativeTol = 0.98;
  const k_absoluteTol = 1e-3;
  if (separationB > k_relativeTol * separationA + k_absoluteTol) {
    poly1 = polyB;
    poly2 = polyA;
    xf1 = xfB;
    xf2 = xfA;
    edge1 = outB.edge;
    flip = 1;
  } else {
    poly1 = polyA;
    poly2 = polyB;
    xf1 = xfA;
    xf2 = xfB;
    edge1 = outA.edge;
    flip = 0;
  }
  findIncidentEdge(incidentEdgeBuf, poly1, xf1, edge1, poly2, xf2);
  const count1 = poly1.vertexCount;
  const vertices1 = poly1.vertices;
  const local1 = vertices1[edge1];
  const local2 = edge1 + 1 < count1 ? vertices1[edge1 + 1] : vertices1[0];
  const dvx = local2.x - local1.x;
  const dvy = local2.y - local1.y;
  let sideNormalX = xf1.R.col1.x * dvx + xf1.R.col2.x * dvy;
  let sideNormalY = xf1.R.col1.y * dvx + xf1.R.col2.y * dvy;
  const sideLen = Math.sqrt(sideNormalX * sideNormalX + sideNormalY * sideNormalY);
  sideNormalX /= sideLen;
  sideNormalY /= sideLen;
  const frontNormalX = sideNormalY;
  const frontNormalY = -sideNormalX;
  const v11x = xf1.position.x + (xf1.R.col1.x * local1.x + xf1.R.col2.x * local1.y);
  const v11y = xf1.position.y + (xf1.R.col1.y * local1.x + xf1.R.col2.y * local1.y);
  const v12x = xf1.position.x + (xf1.R.col1.x * local2.x + xf1.R.col2.x * local2.y);
  const v12y = xf1.position.y + (xf1.R.col1.y * local2.x + xf1.R.col2.y * local2.y);
  const frontOffset = frontNormalX * v11x + frontNormalY * v11y;
  const sideOffset1 = -(sideNormalX * v11x + sideNormalY * v11y);
  const sideOffset2 = sideNormalX * v12x + sideNormalY * v12y;
  let np = clipSegmentToLine(
    clip1Buf,
    incidentEdgeBuf,
    -sideNormalX,
    -sideNormalY,
    sideOffset1
  );
  if (np < 2) return;
  np = clipSegmentToLine(clip2Buf, clip1Buf, sideNormalX, sideNormalY, sideOffset2);
  if (np < 2) return;
  m.normal.x = flip ? -frontNormalX : frontNormalX;
  m.normal.y = flip ? -frontNormalY : frontNormalY;
  let pointCount = 0;
  for (let i = 0; i < 2; i++) {
    const cv = clip2Buf[i];
    const separation = frontNormalX * cv.v.x + frontNormalY * cv.v.y - frontOffset;
    if (separation <= 0) {
      const mp = m.points[pointCount];
      mp.separation = separation;
      mp.normalImpulse = 0;
      mp.tangentImpulse = 0;
      writeLocalPoints(mp, cv.v.x, cv.v.y, xfA, xfB);
      mp.id.setFrom(cv.id);
      mp.id.flip = flip;
      pointCount++;
    }
  }
  m.pointCount = pointCount;
}

// src/physics/b2/contact.ts
var Contact = class {
  shape1;
  shape2;
  manifold = new Manifold();
  previous = new Manifold();
  /** True when NEITHER body is static (2.0.2 excludes those from TOI). */
  slow = false;
  islandFlag = false;
  /** Cached time of impact for this step, valid only while `toiFlag` is set. */
  toi = 1;
  toiFlag = false;
  /** Set for one Collide() when the manifold went from empty to non-empty. */
  began = false;
  constructor(shape1, shape2) {
    this.shape1 = shape1;
    this.shape2 = shape2;
  }
  /** `where` says which body and shape index each of the two shapes is. */
  captureState(where) {
    const m = this.manifold;
    return {
      body1: where[0].body,
      shape1: where[0].shape,
      body2: where[1].body,
      shape2: where[1].shape,
      slow: this.slow,
      began: this.began,
      pointCount: m.pointCount,
      nx: m.normal.x,
      ny: m.normal.y,
      points: m.points.map((p) => ({
        l1x: p.localPoint1.x,
        l1y: p.localPoint1.y,
        l2x: p.localPoint2.x,
        l2y: p.localPoint2.y,
        separation: p.separation,
        normalImpulse: p.normalImpulse,
        tangentImpulse: p.tangentImpulse,
        referenceEdge: p.id.referenceEdge,
        incidentEdge: p.id.incidentEdge,
        incidentVertex: p.id.incidentVertex,
        flip: p.id.flip
      }))
    };
  }
  restoreState(s) {
    const m = this.manifold;
    m.pointCount = s.pointCount;
    m.normal.set(s.nx, s.ny);
    s.points.forEach((p, i) => {
      const mp = m.points[i];
      mp.localPoint1.set(p.l1x, p.l1y);
      mp.localPoint2.set(p.l2x, p.l2y);
      mp.separation = p.separation;
      mp.normalImpulse = p.normalImpulse;
      mp.tangentImpulse = p.tangentImpulse;
      mp.id.referenceEdge = p.referenceEdge;
      mp.id.incidentEdge = p.incidentEdge;
      mp.id.incidentVertex = p.incidentVertex;
      mp.id.flip = p.flip;
    });
    this.slow = s.slow;
    this.began = s.began;
  }
  get body1() {
    return this.shape1.body;
  }
  get body2() {
    return this.shape2.body;
  }
  update() {
    const hadPoints = this.manifold.pointCount > 0;
    this.previous.copyFrom(this.manifold);
    this.evaluate();
    const matched = [false, false];
    for (let i = 0; i < this.manifold.pointCount; i++) {
      const mp = this.manifold.points[i];
      mp.normalImpulse = 0;
      mp.tangentImpulse = 0;
      const key = mp.id.key;
      for (let j = 0; j < this.previous.pointCount; j++) {
        if (matched[j]) continue;
        const old = this.previous.points[j];
        if (old.id.key === key) {
          matched[j] = true;
          mp.normalImpulse = old.normalImpulse;
          mp.tangentImpulse = old.tangentImpulse;
          break;
        }
      }
    }
    const hasPoints = this.manifold.pointCount > 0;
    this.began = hasPoints && !hadPoints;
    if (hadPoints && !hasPoints) {
      this.body1.wakeUp();
      this.body2.wakeUp();
    }
    const b1 = this.body1;
    const b2 = this.body2;
    this.slow = !(b1.isStatic || b2.isStatic);
  }
  evaluate() {
    const b1 = this.body1;
    const b2 = this.body2;
    const s1 = this.shape1;
    const s2 = this.shape2;
    if (s1.type === "circle" && s2.type === "circle") {
      collideCircles(
        this.manifold,
        s1,
        b1.xf,
        s2,
        b2.xf
      );
    } else if (s1.type === "polygon" && s2.type === "circle") {
      collidePolygonAndCircle(
        this.manifold,
        s1,
        b1.xf,
        s2,
        b2.xf
      );
    } else {
      collidePolygons(
        this.manifold,
        s1,
        b1.xf,
        s2,
        b2.xf
      );
    }
  }
};

// src/physics/b2/settings.ts
var b2_linearSlop = 5e-3;
var b2_angularSlop = 2 / 180 * Math.PI;
var b2_toiSlop = 8 * b2_linearSlop;
var b2_velocityThreshold = 1;
var b2_maxLinearCorrection = 0.2;
var b2_maxAngularCorrection = 8 / 180 * Math.PI;
var b2_maxLinearVelocity = 6e3;
var b2_maxLinearVelocitySquared = b2_maxLinearVelocity * b2_maxLinearVelocity;
var b2_maxAngularVelocity = 2500;
var b2_maxAngularVelocitySquared = b2_maxAngularVelocity * b2_maxAngularVelocity;
var b2_contactBaumgarte = 0.5;
var b2_timeToSleep = 0.5;
var b2_linearSleepTolerance = 0.01;
var b2_angularSleepTolerance = 2 / 180;
var mixFriction = (a, b) => Math.sqrt(a * b);
var mixRestitution = (a, b) => a > b ? a : b;

// src/physics/b2/contactSolver.ts
var ConstraintPoint = class {
  localAnchor1 = new Vec2();
  localAnchor2 = new Vec2();
  r1 = new Vec2();
  r2 = new Vec2();
  normalImpulse = 0;
  tangentImpulse = 0;
  normalMass = 0;
  tangentMass = 0;
  equalizedMass = 0;
  separation = 0;
  velocityBias = 0;
};
var Constraint = class {
  points = [new ConstraintPoint(), new ConstraintPoint()];
  normal = new Vec2();
  normalMass = new Mat22();
  K = new Mat22();
  body1;
  body2;
  contact;
  pointCount = 0;
  friction = 0;
  restitution = 0;
};
var ContactSolver = class {
  constraints = [];
  constructor(step, contacts) {
    for (const contact of contacts) {
      const manifold = contact.manifold;
      if (manifold.pointCount === 0) continue;
      const shape1 = contact.shape1;
      const shape2 = contact.shape2;
      const b1 = shape1.body;
      const b2 = shape2.body;
      const c = new Constraint();
      c.body1 = b1;
      c.body2 = b2;
      c.contact = contact;
      c.normal.setV(manifold.normal);
      c.pointCount = manifold.pointCount;
      c.friction = mixFriction(shape1.friction, shape2.friction);
      c.restitution = mixRestitution(shape1.restitution, shape2.restitution);
      const v1x = b1.linearVelocity.x;
      const v1y = b1.linearVelocity.y;
      const v2x = b2.linearVelocity.x;
      const v2y = b2.linearVelocity.y;
      const w1 = b1.angularVelocity;
      const w2 = b2.angularVelocity;
      const normalX = c.normal.x;
      const normalY = c.normal.y;
      for (let k = 0; k < c.pointCount; k++) {
        const cp = manifold.points[k];
        const ccp = c.points[k];
        ccp.normalImpulse = cp.normalImpulse;
        ccp.tangentImpulse = cp.tangentImpulse;
        ccp.separation = cp.separation;
        ccp.localAnchor1.setV(cp.localPoint1);
        ccp.localAnchor2.setV(cp.localPoint2);
        let R = b1.xf.R;
        let ax = cp.localPoint1.x - b1.sweep.localCenter.x;
        let ay = cp.localPoint1.y - b1.sweep.localCenter.y;
        const r1x = R.col1.x * ax + R.col2.x * ay;
        const r1y = R.col1.y * ax + R.col2.y * ay;
        ccp.r1.set(r1x, r1y);
        R = b2.xf.R;
        ax = cp.localPoint2.x - b2.sweep.localCenter.x;
        ay = cp.localPoint2.y - b2.sweep.localCenter.y;
        const r2x = R.col1.x * ax + R.col2.x * ay;
        const r2y = R.col1.y * ax + R.col2.y * ay;
        ccp.r2.set(r2x, r2y);
        let rn1 = r1x * normalY - r1y * normalX;
        let rn2 = r2x * normalY - r2y * normalX;
        rn1 *= rn1;
        rn2 *= rn2;
        const kNormal = b1.invMass + b2.invMass + b1.invI * rn1 + b2.invI * rn2;
        ccp.normalMass = 1 / kNormal;
        let kEqualized = b1.mass * b1.invMass + b2.mass * b2.invMass;
        kEqualized += b1.mass * b1.invI * rn1 + b2.mass * b2.invI * rn2;
        ccp.equalizedMass = 1 / kEqualized;
        const tangentX = normalY;
        const tangentY = -normalX;
        let rt1 = r1x * tangentY - r1y * tangentX;
        let rt2 = r2x * tangentY - r2y * tangentX;
        rt1 *= rt1;
        rt2 *= rt2;
        const kTangent = b1.invMass + b2.invMass + b1.invI * rt1 + b2.invI * rt2;
        ccp.tangentMass = 1 / kTangent;
        ccp.velocityBias = 0;
        if (ccp.separation > 0) {
          ccp.velocityBias = -60 * ccp.separation;
        } else {
          const tx = v2x + -w2 * r2y - v1x - -w1 * r1y;
          const ty = v2y + w2 * r2x - v1y - w1 * r1x;
          const vRel = c.normal.x * tx + c.normal.y * ty;
          if (vRel < -b2_velocityThreshold) {
            ccp.velocityBias += -c.restitution * vRel;
          }
        }
      }
      if (c.pointCount === 2) {
        const ccp1 = c.points[0];
        const ccp2 = c.points[1];
        const invMass1 = b1.invMass;
        const invI1 = b1.invI;
        const invMass2 = b2.invMass;
        const invI2 = b2.invI;
        const rn1A = ccp1.r1.x * normalY - ccp1.r1.y * normalX;
        const rn1B = ccp1.r2.x * normalY - ccp1.r2.y * normalX;
        const rn2A = ccp2.r1.x * normalY - ccp2.r1.y * normalX;
        const rn2B = ccp2.r2.x * normalY - ccp2.r2.y * normalX;
        const k11 = invMass1 + invMass2 + invI1 * rn1A * rn1A + invI2 * rn1B * rn1B;
        const k22 = invMass1 + invMass2 + invI1 * rn2A * rn2A + invI2 * rn2B * rn2B;
        const k12 = invMass1 + invMass2 + invI1 * rn1A * rn2A + invI2 * rn1B * rn2B;
        const k_maxConditionNumber = 100;
        if (k11 * k11 < k_maxConditionNumber * (k11 * k22 - k12 * k12)) {
          c.K.col1.set(k11, k12);
          c.K.col2.set(k12, k22);
          c.K.getInverse(c.normalMass);
        } else {
          c.pointCount = 1;
        }
      }
      this.constraints.push(c);
    }
    void step;
  }
  initVelocityConstraints(step) {
    for (const c of this.constraints) {
      const b1 = c.body1;
      const b2 = c.body2;
      const invMass1 = b1.invMass;
      const invI1 = b1.invI;
      const invMass2 = b2.invMass;
      const invI2 = b2.invI;
      const normalX = c.normal.x;
      const normalY = c.normal.y;
      const tangentX = normalY;
      const tangentY = -normalX;
      if (step.warmStarting) {
        for (let j = 0; j < c.pointCount; j++) {
          const ccp = c.points[j];
          ccp.normalImpulse *= step.dtRatio;
          ccp.tangentImpulse *= step.dtRatio;
          const px = ccp.normalImpulse * normalX + ccp.tangentImpulse * tangentX;
          const py = ccp.normalImpulse * normalY + ccp.tangentImpulse * tangentY;
          b1.angularVelocity -= invI1 * (ccp.r1.x * py - ccp.r1.y * px);
          b1.linearVelocity.x -= invMass1 * px;
          b1.linearVelocity.y -= invMass1 * py;
          b2.angularVelocity += invI2 * (ccp.r2.x * py - ccp.r2.y * px);
          b2.linearVelocity.x += invMass2 * px;
          b2.linearVelocity.y += invMass2 * py;
        }
      } else {
        for (let j = 0; j < c.pointCount; j++) {
          c.points[j].normalImpulse = 0;
          c.points[j].tangentImpulse = 0;
        }
      }
    }
  }
  solveVelocityConstraints() {
    for (const c of this.constraints) {
      const b1 = c.body1;
      const b2 = c.body2;
      let w1 = b1.angularVelocity;
      let w2 = b2.angularVelocity;
      const v1 = b1.linearVelocity;
      const v2 = b2.linearVelocity;
      const invMass1 = b1.invMass;
      const invI1 = b1.invI;
      const invMass2 = b2.invMass;
      const invI2 = b2.invI;
      const normalX = c.normal.x;
      const normalY = c.normal.y;
      const tangentX = normalY;
      const tangentY = -normalX;
      const friction = c.friction;
      if (c.pointCount === 1) {
        const ccp = c.points[0];
        let dvx = v2.x + -w2 * ccp.r2.y - v1.x - -w1 * ccp.r1.y;
        let dvy = v2.y + w2 * ccp.r2.x - v1.y - w1 * ccp.r1.x;
        const vn = dvx * normalX + dvy * normalY;
        let normalImpulse = -ccp.normalMass * (vn - ccp.velocityBias);
        const vt = dvx * tangentX + dvy * tangentY;
        let tangentImpulse = ccp.tangentMass * -vt;
        const newNormal = Math.max(ccp.normalImpulse + normalImpulse, 0);
        normalImpulse = newNormal - ccp.normalImpulse;
        const maxFriction = friction * ccp.normalImpulse;
        const newTangent = clamp(
          ccp.tangentImpulse + tangentImpulse,
          -maxFriction,
          maxFriction
        );
        tangentImpulse = newTangent - ccp.tangentImpulse;
        const px = normalImpulse * normalX + tangentImpulse * tangentX;
        const py = normalImpulse * normalY + tangentImpulse * tangentY;
        v1.x -= invMass1 * px;
        v1.y -= invMass1 * py;
        w1 -= invI1 * (ccp.r1.x * py - ccp.r1.y * px);
        v2.x += invMass2 * px;
        v2.y += invMass2 * py;
        w2 += invI2 * (ccp.r2.x * py - ccp.r2.y * px);
        ccp.normalImpulse = newNormal;
        ccp.tangentImpulse = newTangent;
        void dvx;
        void dvy;
      } else {
        const cp1 = c.points[0];
        const cp2 = c.points[1];
        const a1 = cp1.normalImpulse;
        const a2 = cp2.normalImpulse;
        let dv1x = v2.x - w2 * cp1.r2.y - v1.x + w1 * cp1.r1.y;
        let dv1y = v2.y + w2 * cp1.r2.x - v1.y - w1 * cp1.r1.x;
        let dv2x = v2.x - w2 * cp2.r2.y - v1.x + w1 * cp2.r1.y;
        let dv2y = v2.y + w2 * cp2.r2.x - v1.y - w1 * cp2.r1.x;
        let vn1 = dv1x * normalX + dv1y * normalY;
        let vn2 = dv2x * normalX + dv2y * normalY;
        let bx = vn1 - cp1.velocityBias;
        let by = vn2 - cp2.velocityBias;
        bx -= c.K.col1.x * a1 + c.K.col2.x * a2;
        by -= c.K.col1.y * a1 + c.K.col2.y * a2;
        let x = -(c.normalMass.col1.x * bx + c.normalMass.col2.x * by);
        let y = -(c.normalMass.col1.y * bx + c.normalMass.col2.y * by);
        let applied = false;
        const apply = () => {
          const d1 = x - a1;
          const d2 = y - a2;
          const p1x = d1 * normalX;
          const p1y = d1 * normalY;
          const p2x = d2 * normalX;
          const p2y = d2 * normalY;
          v1.x -= invMass1 * (p1x + p2x);
          v1.y -= invMass1 * (p1y + p2y);
          w1 -= invI1 * (cp1.r1.x * p1y - cp1.r1.y * p1x + cp2.r1.x * p2y - cp2.r1.y * p2x);
          v2.x += invMass2 * (p1x + p2x);
          v2.y += invMass2 * (p1y + p2y);
          w2 += invI2 * (cp1.r2.x * p1y - cp1.r2.y * p1x + cp2.r2.x * p2y - cp2.r2.y * p2x);
          cp1.normalImpulse = x;
          cp2.normalImpulse = y;
          applied = true;
        };
        if (x >= 0 && y >= 0) {
          apply();
        } else {
          x = -cp1.normalMass * bx;
          y = 0;
          vn1 = 0;
          vn2 = c.K.col1.y * x + by;
          if (x >= 0 && vn2 >= 0) {
            apply();
          } else {
            x = 0;
            y = -cp2.normalMass * by;
            vn1 = c.K.col2.x * y + bx;
            vn2 = 0;
            if (y >= 0 && vn1 >= 0) {
              apply();
            } else {
              x = 0;
              y = 0;
              vn1 = bx;
              vn2 = by;
              if (vn1 >= 0 && vn2 >= 0) apply();
            }
          }
        }
        void applied;
        void dv1x;
        void dv1y;
        void dv2x;
        void dv2y;
        for (let j = 0; j < c.pointCount; j++) {
          const ccp = c.points[j];
          const dvx = v2.x - w2 * ccp.r2.y - v1.x + w1 * ccp.r1.y;
          const dvy = v2.y + w2 * ccp.r2.x - v1.y - w1 * ccp.r1.x;
          const vt = dvx * tangentX + dvy * tangentY;
          let tangentImpulse = ccp.tangentMass * -vt;
          const maxFriction = friction * ccp.normalImpulse;
          const newTangent = clamp(
            ccp.tangentImpulse + tangentImpulse,
            -maxFriction,
            maxFriction
          );
          tangentImpulse = newTangent - ccp.tangentImpulse;
          const px = tangentImpulse * tangentX;
          const py = tangentImpulse * tangentY;
          v1.x -= invMass1 * px;
          v1.y -= invMass1 * py;
          w1 -= invI1 * (ccp.r1.x * py - ccp.r1.y * px);
          v2.x += invMass2 * px;
          v2.y += invMass2 * py;
          w2 += invI2 * (ccp.r2.x * py - ccp.r2.y * px);
          ccp.tangentImpulse = newTangent;
        }
      }
      b1.angularVelocity = w1;
      b2.angularVelocity = w2;
    }
  }
  /** Writes the accumulated impulses back for next step's warm start. */
  finalizeVelocityConstraints() {
    for (const c of this.constraints) {
      const manifold = c.contact.manifold;
      for (let j = 0; j < c.pointCount; j++) {
        manifold.points[j].normalImpulse = c.points[j].normalImpulse;
        manifold.points[j].tangentImpulse = c.points[j].tangentImpulse;
      }
    }
  }
  solvePositionConstraints(baumgarte) {
    let minSeparation = 0;
    for (const c of this.constraints) {
      const b1 = c.body1;
      const b2 = c.body2;
      const invMass1 = b1.mass * b1.invMass;
      const invI1 = b1.mass * b1.invI;
      const invMass2 = b2.mass * b2.invMass;
      const invI2 = b2.mass * b2.invI;
      const normalX = c.normal.x;
      const normalY = c.normal.y;
      for (let j = 0; j < c.pointCount; j++) {
        const ccp = c.points[j];
        let R = b1.xf.R;
        let lc = b1.sweep.localCenter;
        let ax = ccp.localAnchor1.x - lc.x;
        let ay = ccp.localAnchor1.y - lc.y;
        const r1x = R.col1.x * ax + R.col2.x * ay;
        const r1y = R.col1.y * ax + R.col2.y * ay;
        R = b2.xf.R;
        lc = b2.sweep.localCenter;
        ax = ccp.localAnchor2.x - lc.x;
        ay = ccp.localAnchor2.y - lc.y;
        const r2x = R.col1.x * ax + R.col2.x * ay;
        const r2y = R.col1.y * ax + R.col2.y * ay;
        const p1x = b1.sweep.c.x + r1x;
        const p1y = b1.sweep.c.y + r1y;
        const p2x = b2.sweep.c.x + r2x;
        const p2y = b2.sweep.c.y + r2y;
        const dx = p2x - p1x;
        const dy = p2y - p1y;
        const separation = dx * normalX + dy * normalY + ccp.separation;
        minSeparation = Math.min(minSeparation, separation);
        const C = baumgarte * clamp(separation + b2_linearSlop, -b2_maxLinearCorrection, 0);
        const impulse = -ccp.equalizedMass * C;
        const px = impulse * normalX;
        const py = impulse * normalY;
        b1.sweep.c.x -= invMass1 * px;
        b1.sweep.c.y -= invMass1 * py;
        b1.sweep.a -= invI1 * (r1x * py - r1y * px);
        b1.synchronizeTransform();
        b2.sweep.c.x += invMass2 * px;
        b2.sweep.c.y += invMass2 * py;
        b2.sweep.a += invI2 * (r2x * py - r2y * px);
        b2.synchronizeTransform();
      }
    }
    return minSeparation >= -1.5 * b2_linearSlop;
  }
};

// src/physics/b2/revoluteJoint.ts
var RevoluteJoint = class {
  body1;
  body2;
  localAnchor1 = new Vec2();
  localAnchor2 = new Vec2();
  referenceAngle;
  impulse = new Vec3();
  motorImpulse = 0;
  mass = new Mat33();
  motorMass = 0;
  enableMotor = true;
  maxMotorTorque;
  motorSpeed = 0;
  K = new Mat22();
  K1 = new Mat22();
  K2 = new Mat22();
  K3 = new Mat22();
  tImpulse = new Vec2();
  /**
   * b2RevoluteJointDef.Initialize(b1, b2, anchor): local anchors come from the
   * world anchor and the reference angle from the current relative rotation.
   */
  constructor(body1, body2, anchorX, anchorY, maxMotorTorque) {
    this.body1 = body1;
    this.body2 = body2;
    this.maxMotorTorque = maxMotorTorque;
    this.localAnchor1 = toLocal(body1, anchorX, anchorY);
    this.localAnchor2 = toLocal(body2, anchorX, anchorY);
    this.referenceAngle = body2.sweep.a - body1.sweep.a;
    body1.connected.add(body2);
    body2.connected.add(body1);
  }
  captureState() {
    return {
      ax1: this.localAnchor1.x,
      ay1: this.localAnchor1.y,
      ax2: this.localAnchor2.x,
      ay2: this.localAnchor2.y,
      referenceAngle: this.referenceAngle,
      ix: this.impulse.x,
      iy: this.impulse.y,
      iz: this.impulse.z,
      motorImpulse: this.motorImpulse,
      motorSpeed: this.motorSpeed,
      enableMotor: this.enableMotor,
      maxMotorTorque: this.maxMotorTorque
    };
  }
  restoreState(s) {
    this.localAnchor1.set(s.ax1, s.ay1);
    this.localAnchor2.set(s.ax2, s.ay2);
    this.referenceAngle = s.referenceAngle;
    this.impulse.x = s.ix;
    this.impulse.y = s.iy;
    this.impulse.z = s.iz;
    this.motorImpulse = s.motorImpulse;
    this.motorSpeed = s.motorSpeed;
    this.enableMotor = s.enableMotor;
    this.maxMotorTorque = s.maxMotorTorque;
  }
  getJointAngle() {
    return this.body2.sweep.a - this.body1.sweep.a - this.referenceAngle;
  }
  setMotorSpeed(speed) {
    this.body1.wakeUp();
    this.body2.wakeUp();
    this.motorSpeed = speed;
  }
  initVelocityConstraints(step) {
    const b1 = this.body1;
    const b2 = this.body2;
    const r1 = rotateLocalAnchor(b1, this.localAnchor1);
    const r2 = rotateLocalAnchor(b2, this.localAnchor2);
    const m1 = b1.invMass;
    const m2 = b2.invMass;
    const i1 = b1.invI;
    const i2 = b2.invI;
    this.mass.col1.x = m1 + m2 + r1.y * r1.y * i1 + r2.y * r2.y * i2;
    this.mass.col2.x = -r1.y * r1.x * i1 - r2.y * r2.x * i2;
    this.mass.col3.x = -r1.y * i1 - r2.y * i2;
    this.mass.col1.y = this.mass.col2.x;
    this.mass.col2.y = m1 + m2 + r1.x * r1.x * i1 + r2.x * r2.x * i2;
    this.mass.col3.y = r1.x * i1 + r2.x * i2;
    this.mass.col1.z = this.mass.col3.x;
    this.mass.col2.z = this.mass.col3.y;
    this.mass.col3.z = i1 + i2;
    this.motorMass = 1 / (i1 + i2);
    if (!this.enableMotor) this.motorImpulse = 0;
    if (step.warmStarting) {
      this.impulse.x *= step.dtRatio;
      this.impulse.y *= step.dtRatio;
      this.motorImpulse *= step.dtRatio;
      const px = this.impulse.x;
      const py = this.impulse.y;
      b1.linearVelocity.x -= m1 * px;
      b1.linearVelocity.y -= m1 * py;
      b1.angularVelocity -= i1 * (r1.x * py - r1.y * px + this.motorImpulse + this.impulse.z);
      b2.linearVelocity.x += m2 * px;
      b2.linearVelocity.y += m2 * py;
      b2.angularVelocity += i2 * (r2.x * py - r2.y * px + this.motorImpulse + this.impulse.z);
    } else {
      this.impulse.setZero();
      this.motorImpulse = 0;
    }
  }
  solveVelocityConstraints(step) {
    const b1 = this.body1;
    const b2 = this.body2;
    const v1 = b1.linearVelocity;
    let w1 = b1.angularVelocity;
    const v2 = b2.linearVelocity;
    let w2 = b2.angularVelocity;
    const m1 = b1.invMass;
    const m2 = b2.invMass;
    const i1 = b1.invI;
    const i2 = b2.invI;
    if (this.enableMotor) {
      const Cdot = w2 - w1 - this.motorSpeed;
      let impulse = this.motorMass * -Cdot;
      const oldImpulse = this.motorImpulse;
      const maxImpulse = step.dt * this.maxMotorTorque;
      this.motorImpulse = clamp(this.motorImpulse + impulse, -maxImpulse, maxImpulse);
      impulse = this.motorImpulse - oldImpulse;
      w1 -= i1 * impulse;
      w2 += i2 * impulse;
    }
    const r1 = rotateLocalAnchor(b1, this.localAnchor1);
    const r2 = rotateLocalAnchor(b2, this.localAnchor2);
    const Cdotx = v2.x + -w2 * r2.y - v1.x - -w1 * r1.y;
    const Cdoty = v2.y + w2 * r2.x - v1.y - w1 * r1.x;
    const impulseV = this.mass.solve22(this.tImpulse, -Cdotx, -Cdoty);
    this.impulse.x += impulseV.x;
    this.impulse.y += impulseV.y;
    v1.x -= m1 * impulseV.x;
    v1.y -= m1 * impulseV.y;
    w1 -= i1 * (r1.x * impulseV.y - r1.y * impulseV.x);
    v2.x += m2 * impulseV.x;
    v2.y += m2 * impulseV.y;
    w2 += i2 * (r2.x * impulseV.y - r2.y * impulseV.x);
    b1.angularVelocity = w1;
    b2.angularVelocity = w2;
  }
  solvePositionConstraints() {
    const b1 = this.body1;
    const b2 = this.body2;
    const angularError = 0;
    const r1 = rotateLocalAnchor(b1, this.localAnchor1);
    const r2 = rotateLocalAnchor(b2, this.localAnchor2);
    let Cx = b2.sweep.c.x + r2.x - b1.sweep.c.x - r1.x;
    let Cy = b2.sweep.c.y + r2.y - b1.sweep.c.y - r1.y;
    const CLengthSquared = Cx * Cx + Cy * Cy;
    const CLength = Math.sqrt(CLengthSquared);
    const positionError = CLength;
    const invMass1 = b1.invMass;
    const invMass2 = b2.invMass;
    const invI1 = b1.invI;
    const invI2 = b2.invI;
    const k_allowedStretch = 10 * b2_linearSlop;
    if (CLengthSquared > k_allowedStretch * k_allowedStretch) {
      const invMass = invMass1 + invMass2;
      const mass = 1 / invMass;
      const impulseX = mass * -Cx;
      const impulseY = mass * -Cy;
      const k_beta = 0.5;
      b1.sweep.c.x -= k_beta * invMass1 * impulseX;
      b1.sweep.c.y -= k_beta * invMass1 * impulseY;
      b2.sweep.c.x += k_beta * invMass2 * impulseX;
      b2.sweep.c.y += k_beta * invMass2 * impulseY;
      Cx = b2.sweep.c.x + r2.x - b1.sweep.c.x - r1.x;
      Cy = b2.sweep.c.y + r2.y - b1.sweep.c.y - r1.y;
    }
    this.K1.col1.x = invMass1 + invMass2;
    this.K1.col2.x = 0;
    this.K1.col1.y = 0;
    this.K1.col2.y = invMass1 + invMass2;
    this.K2.col1.x = invI1 * r1.y * r1.y;
    this.K2.col2.x = -invI1 * r1.x * r1.y;
    this.K2.col1.y = -invI1 * r1.x * r1.y;
    this.K2.col2.y = invI1 * r1.x * r1.x;
    this.K3.col1.x = invI2 * r2.y * r2.y;
    this.K3.col2.x = -invI2 * r2.x * r2.y;
    this.K3.col1.y = -invI2 * r2.x * r2.y;
    this.K3.col2.y = invI2 * r2.x * r2.x;
    this.K.setM(this.K1);
    this.K.addM(this.K2);
    this.K.addM(this.K3);
    this.K.solve(this.tImpulse, -Cx, -Cy);
    b1.sweep.c.x -= b1.invMass * this.tImpulse.x;
    b1.sweep.c.y -= b1.invMass * this.tImpulse.y;
    b1.sweep.a -= b1.invI * (r1.x * this.tImpulse.y - r1.y * this.tImpulse.x);
    b2.sweep.c.x += b2.invMass * this.tImpulse.x;
    b2.sweep.c.y += b2.invMass * this.tImpulse.y;
    b2.sweep.a += b2.invI * (r2.x * this.tImpulse.y - r2.y * this.tImpulse.x);
    b1.synchronizeTransform();
    b2.synchronizeTransform();
    return positionError <= b2_linearSlop && angularError <= b2_angularSlop;
  }
};
function toLocal(body, wx, wy) {
  const dx = wx - body.xf.position.x;
  const dy = wy - body.xf.position.y;
  const R = body.xf.R;
  return new Vec2(dx * R.col1.x + dy * R.col1.y, dx * R.col2.x + dy * R.col2.y);
}
function rotateLocalAnchor(body, localAnchor) {
  const R = body.xf.R;
  const lc = body.sweep.localCenter;
  const ax = localAnchor.x - lc.x;
  const ay = localAnchor.y - lc.y;
  return new Vec2(R.col1.x * ax + R.col2.x * ay, R.col1.y * ax + R.col2.y * ay);
}

// src/physics/b2/distance.ts
var PointShape = class {
  p = new Vec2();
  support() {
    return this.p;
  }
  getFirstVertex() {
    return this.p;
  }
};
var IDENTITY = new XForm();
IDENTITY.R.setAngle(0);
var s_p1s = [new Vec2(), new Vec2(), new Vec2()];
var s_p2s = [new Vec2(), new Vec2(), new Vec2()];
var s_points = [new Vec2(), new Vec2(), new Vec2()];
var gPoint = new PointShape();
function processTwo(x1, x2, p1s, p2s, points) {
  const w1 = points[0];
  const w2 = points[1];
  const p1r = p1s[0];
  const p1s1 = p1s[1];
  const p2r = p2s[0];
  const p2s1 = p2s[1];
  const rx = -w2.x;
  const ry = -w2.y;
  let dx = w1.x - w2.x;
  let dy = w1.y - w2.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  dx /= length;
  dy /= length;
  let lambda = rx * dx + ry * dy;
  if (lambda <= 0 || length < Number.MIN_VALUE) {
    x1.setV(p1s1);
    x2.setV(p2s1);
    p1r.setV(p1s1);
    p2r.setV(p2s1);
    w1.setV(w2);
    return 1;
  }
  lambda /= length;
  x1.x = p1s1.x + lambda * (p1r.x - p1s1.x);
  x1.y = p1s1.y + lambda * (p1r.y - p1s1.y);
  x2.x = p2s1.x + lambda * (p2r.x - p2s1.x);
  x2.y = p2s1.y + lambda * (p2r.y - p2s1.y);
  return 2;
}
function processThree(x1, x2, p1s, p2s, points) {
  const w1 = points[0];
  const w2 = points[1];
  const w3 = points[2];
  const p1a = p1s[0];
  const p1b = p1s[1];
  const p1c = p1s[2];
  const p2a = p2s[0];
  const p2b = p2s[1];
  const p2c = p2s[2];
  const ax = w1.x;
  const ay = w1.y;
  const bx = w2.x;
  const by = w2.y;
  const cx = w3.x;
  const cy = w3.y;
  const abx = bx - ax;
  const aby = by - ay;
  const acx = cx - ax;
  const acy = cy - ay;
  const bcx = cx - bx;
  const bcy = cy - by;
  void -(ax * abx + ay * aby);
  void (bx * abx + by * aby);
  const tn = -(ax * acx + ay * acy);
  const td = cx * acx + cy * acy;
  const un = -(bx * bcx + by * bcy);
  const ud = cx * bcx + cy * bcy;
  if (td <= 0 && ud <= 0) {
    x1.setV(p1c);
    x2.setV(p2c);
    p1a.setV(p1c);
    p2a.setV(p2c);
    w1.setV(w3);
    return 1;
  }
  const n = abx * acy - aby * acx;
  const uABC = n * (ax * by - ay * bx);
  const vABC = n * (bx * cy - by * cx);
  const wABC = n * (cx * ay - cy * ax);
  if (vABC <= 0 && un >= 0 && ud >= 0 && un + ud > 0) {
    const lambda = un / (un + ud);
    x1.x = p1b.x + lambda * (p1c.x - p1b.x);
    x1.y = p1b.y + lambda * (p1c.y - p1b.y);
    x2.x = p2b.x + lambda * (p2c.x - p2b.x);
    x2.y = p2b.y + lambda * (p2c.y - p2b.y);
    p1a.setV(p1c);
    p2a.setV(p2c);
    w1.setV(w3);
    return 2;
  }
  if (wABC <= 0 && tn >= 0 && td >= 0 && tn + td > 0) {
    const lambda = tn / (tn + td);
    x1.x = p1a.x + lambda * (p1c.x - p1a.x);
    x1.y = p1a.y + lambda * (p1c.y - p1a.y);
    x2.x = p2a.x + lambda * (p2c.x - p2a.x);
    x2.y = p2a.y + lambda * (p2c.y - p2a.y);
    p1b.setV(p1c);
    p2b.setV(p2c);
    w2.setV(w3);
    return 2;
  }
  let denom = vABC + wABC + uABC;
  denom = 1 / denom;
  const u = vABC * denom;
  const v = wABC * denom;
  const w = 1 - u - v;
  x1.x = u * p1a.x + v * p1b.x + w * p1c.x;
  x1.y = u * p1a.y + v * p1b.y + w * p1c.y;
  x2.x = u * p2a.x + v * p2b.x + w * p2c.x;
  x2.y = u * p2a.y + v * p2b.y + w * p2c.y;
  return 3;
}
function distanceGeneric(x1, x2, shape1, xf1, shape2, xf2) {
  const p1s = s_p1s;
  const p2s = s_p2s;
  const points = s_points;
  let pointCount = 0;
  x1.setV(shape1.getFirstVertex(xf1));
  x2.setV(shape2.getFirstVertex(xf2));
  let vSqr = 0;
  const maxIterations = 20;
  for (let iter = 0; iter < maxIterations; iter++) {
    const vx = x2.x - x1.x;
    const vy = x2.y - x1.y;
    const w1 = shape1.support(xf1, vx, vy);
    const w2 = shape2.support(xf2, -vx, -vy);
    vSqr = vx * vx + vy * vy;
    const wx = w2.x - w1.x;
    const wy = w2.y - w1.y;
    const vw = vx * wx + vy * wy;
    if (vSqr - vw <= 0.01 * vSqr) {
      if (pointCount === 0) {
        x1.setV(w1);
        x2.setV(w2);
      }
      return Math.sqrt(vSqr);
    }
    switch (pointCount) {
      case 0:
        p1s[0].setV(w1);
        p2s[0].setV(w2);
        points[0].set(wx, wy);
        x1.setV(p1s[0]);
        x2.setV(p2s[0]);
        pointCount++;
        break;
      case 1:
        p1s[1].setV(w1);
        p2s[1].setV(w2);
        points[1].set(wx, wy);
        pointCount = processTwo(x1, x2, p1s, p2s, points);
        break;
      case 2:
        p1s[2].setV(w1);
        p2s[2].setV(w2);
        points[2].set(wx, wy);
        pointCount = processThree(x1, x2, p1s, p2s, points);
        break;
    }
    if (pointCount === 3) return 0;
    let maxSqr = -Number.MAX_VALUE;
    for (let i = 0; i < pointCount; i++) {
      const p = points[i];
      maxSqr = Math.max(maxSqr, p.x * p.x + p.y * p.y);
    }
    if (vSqr <= 100 * Number.MIN_VALUE * maxSqr) {
      const dx = x2.x - x1.x;
      const dy = x2.y - x1.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
  }
  return Math.sqrt(vSqr);
}
function distanceCC(x1, x2, c1, xf1, c2, xf2) {
  let R = xf1.R;
  let lp = c1.localPosition;
  const p1x = xf1.position.x + (R.col1.x * lp.x + R.col2.x * lp.y);
  const p1y = xf1.position.y + (R.col1.y * lp.x + R.col2.y * lp.y);
  R = xf2.R;
  lp = c2.localPosition;
  const p2x = xf2.position.x + (R.col1.x * lp.x + R.col2.x * lp.y);
  const p2y = xf2.position.y + (R.col1.y * lp.x + R.col2.y * lp.y);
  let dx = p2x - p1x;
  let dy = p2y - p1y;
  const distSqr = dx * dx + dy * dy;
  const r1 = c1.radius - b2_toiSlop;
  const r2 = c2.radius - b2_toiSlop;
  const radiusSum = r1 + r2;
  if (distSqr > radiusSum * radiusSum) {
    const dist2 = Math.sqrt(distSqr);
    dx /= dist2;
    dy /= dist2;
    x1.set(p1x + r1 * dx, p1y + r1 * dy);
    x2.set(p2x - r2 * dx, p2y - r2 * dy);
    return dist2 - radiusSum;
  }
  if (distSqr > Number.MIN_VALUE * Number.MIN_VALUE) {
    const dist2 = Math.sqrt(distSqr);
    dx /= dist2;
    dy /= dist2;
    x1.set(p1x + r1 * dx, p1y + r1 * dy);
    x2.setV(x1);
    return 0;
  }
  x1.set(p1x, p1y);
  x2.setV(x1);
  return 0;
}
function distancePC(x1, x2, poly, xf1, circle, xf2) {
  const lp = circle.localPosition;
  const R = xf2.R;
  gPoint.p.set(
    xf2.position.x + (R.col1.x * lp.x + R.col2.x * lp.y),
    xf2.position.y + (R.col1.y * lp.x + R.col2.y * lp.y)
  );
  let distance2 = distanceGeneric(x1, x2, poly, xf1, gPoint, IDENTITY);
  const r = circle.radius - b2_toiSlop;
  if (distance2 > r) {
    distance2 -= r;
    let dx = x2.x - x1.x;
    let dy = x2.y - x1.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
    x2.x -= r * dx;
    x2.y -= r * dy;
  } else {
    distance2 = 0;
    x2.setV(x1);
  }
  return distance2;
}
function distance(x1, x2, shape1, xf1, shape2, xf2) {
  if (shape1.type === "circle" && shape2.type === "circle") {
    return distanceCC(x1, x2, shape1, xf1, shape2, xf2);
  }
  if (shape1.type === "polygon" && shape2.type === "circle") {
    return distancePC(x1, x2, shape1, xf1, shape2, xf2);
  }
  if (shape1.type === "circle" && shape2.type === "polygon") {
    return distancePC(x2, x1, shape2, xf2, shape1, xf1);
  }
  return distanceGeneric(
    x1,
    x2,
    shape1,
    xf1,
    shape2,
    xf2
  );
}

// src/physics/b2/toi.ts
var s_p1 = new Vec2();
var s_p2 = new Vec2();
var s_xf1 = new XForm();
var s_xf2 = new XForm();
function timeOfImpact(shape1, sweep1, shape2, sweep2) {
  const r1 = shape1.sweepRadius;
  const r2 = shape2.sweepRadius;
  const t0 = sweep1.t0;
  const v1x = sweep1.c.x - sweep1.c0.x;
  const v1y = sweep1.c.y - sweep1.c0.y;
  const v2x = sweep2.c.x - sweep2.c0.x;
  const v2y = sweep2.c.y - sweep2.c0.y;
  const omega1 = sweep1.a - sweep1.a0;
  const omega2 = sweep2.a - sweep2.a0;
  let alpha = 0;
  let target = 0;
  const maxIterations = 20;
  for (let iter = 0; ; iter++) {
    const t = (1 - alpha) * t0 + alpha;
    sweep1.getXForm(s_xf1, t);
    sweep2.getXForm(s_xf2, t);
    const d = distance(s_p1, s_p2, shape1, s_xf1, shape2, s_xf2);
    if (iter === 0) {
      if (d > 2 * b2_toiSlop) {
        target = 1.5 * b2_toiSlop;
      } else {
        const lower = 0.05 * b2_toiSlop;
        const upper = d - 0.5 * b2_toiSlop;
        target = lower > upper ? lower : upper;
      }
    }
    if (d - target < 0.05 * b2_toiSlop || iter === maxIterations) break;
    let nx = s_p2.x - s_p1.x;
    let ny = s_p2.y - s_p1.y;
    const len = Math.sqrt(nx * nx + ny * ny);
    nx /= len;
    ny /= len;
    const approach = nx * (v1x - v2x) + ny * (v1y - v2y) + (omega1 < 0 ? -omega1 : omega1) * r1 + (omega2 < 0 ? -omega2 : omega2) * r2;
    if (approach === 0) {
      alpha = 1;
      break;
    }
    const dAlpha = (d - target) / approach;
    const newAlpha = alpha + dAlpha;
    if (newAlpha < 0 || newAlpha > 1) {
      alpha = 1;
      break;
    }
    if (newAlpha < (1 + 100 * Number.MIN_VALUE) * alpha) break;
    alpha = newAlpha;
  }
  return alpha;
}

// src/physics/b2/world.ts
var World = class {
  gravity;
  allowSleep;
  bodies = [];
  joints = [];
  contacts = /* @__PURE__ */ new Map();
  shapeIds = /* @__PURE__ */ new WeakMap();
  nextShapeId = 1;
  inv_dt0 = 0;
  scratchXF = new XForm();
  warmStarting = true;
  continuousPhysics = true;
  /** Contacts that began during the most recent step(). */
  beganContacts = [];
  constructor(gravityX, gravityY, allowSleep = true) {
    this.gravity = new Vec2(gravityX, gravityY);
    this.allowSleep = allowSleep;
  }
  createBody(def) {
    const body = new Body(def);
    this.bodies.push(body);
    return body;
  }
  destroyBody(body) {
    const i = this.bodies.indexOf(body);
    if (i >= 0) this.bodies.splice(i, 1);
    for (const [key, contact] of this.contacts) {
      if (contact.body1 === body || contact.body2 === body) {
        this.contacts.delete(key);
      }
    }
    for (const other of body.connected) other.connected.delete(body);
    for (let j = this.joints.length - 1; j >= 0; j--) {
      const joint = this.joints[j];
      if (joint.body1 === body || joint.body2 === body) this.joints.splice(j, 1);
    }
  }
  createJoint(joint) {
    this.joints.push(joint);
    return joint;
  }
  destroyJoint(joint) {
    const i = this.joints.indexOf(joint);
    if (i >= 0) this.joints.splice(i, 1);
    joint.body1.connected.delete(joint.body2);
    joint.body2.connected.delete(joint.body1);
  }
  // -------------------------------------------------------------------------
  // Rewinding
  //
  // The solver is order-dependent — it works through bodies, islands and
  // contacts one after another, each seeing the last one's result — so "the same
  // state" includes the order things are listed in, not just their values.
  // -------------------------------------------------------------------------
  captureState() {
    const index = /* @__PURE__ */ new Map();
    this.bodies.forEach((b, i) => index.set(b, i));
    const where = (s) => {
      const body = s.body;
      return { body: index.get(body), shape: body.shapes.indexOf(s) };
    };
    return {
      bodies: this.bodies.map((b) => b.captureState()),
      joints: this.joints.map((j) => ({
        body1: index.get(j.body1),
        body2: index.get(j.body2),
        state: j.captureState()
      })),
      contacts: [...this.contacts.values()].map(
        (c) => c.captureState([where(c.shape1), where(c.shape2)])
      ),
      invDt0: this.inv_dt0
    };
  }
  /**
   * Rewrites the world from `state`. The caller has already arranged for
   * `this.bodies` to hold the right bodies **in the captured order** (rebuilding
   * any that a power-up replaced since); this fills them in, reorders the joint
   * list to match, and rebuilds the contact list with its impulses.
   */
  restoreState(state) {
    if (state.bodies.length !== this.bodies.length) {
      throw new Error(
        `World.restoreState: ${state.bodies.length} bodies captured, ${this.bodies.length} present`
      );
    }
    this.bodies.forEach((b, i) => b.restoreState(state.bodies[i]));
    const orderedJoints = [];
    for (const js of state.joints) {
      const b1 = this.bodies[js.body1];
      const b2 = this.bodies[js.body2];
      const joint = this.joints.find((j) => j.body1 === b1 && j.body2 === b2);
      if (!joint) throw new Error("World.restoreState: a captured joint is missing");
      joint.restoreState(js.state);
      orderedJoints.push(joint);
    }
    if (orderedJoints.length !== this.joints.length) {
      throw new Error("World.restoreState: the joint lists differ in length");
    }
    this.joints.length = 0;
    this.joints.push(...orderedJoints);
    this.contacts.clear();
    for (const cs of state.contacts) {
      const s1 = this.bodies[cs.body1].shapes[cs.shape1];
      const s2 = this.bodies[cs.body2].shapes[cs.shape2];
      const contact = new Contact(s1, s2);
      contact.restoreState(cs);
      this.contacts.set(`${this.idOf(s1)}:${this.idOf(s2)}`, contact);
    }
    this.inv_dt0 = state.invDt0;
    this.beganContacts.length = 0;
  }
  idOf(shape) {
    let id = this.shapeIds.get(shape);
    if (id === void 0) {
      id = this.nextShapeId++;
      this.shapeIds.set(shape, id);
    }
    return id;
  }
  /** b2ContactFilter.ShouldCollide plus b2Body.IsConnected. */
  shouldCollide(s1, s2) {
    const b1 = s1.body;
    const b2 = s2.body;
    if (b1 === b2) return false;
    if (b1.isStatic && b2.isStatic) return false;
    if (b1.connected.has(b2)) return false;
    const g1 = s1.filter.groupIndex;
    const g2 = s2.filter.groupIndex;
    if (g1 === g2 && g1 !== 0) return g1 > 0;
    return (s1.filter.maskBits & s2.filter.categoryBits) !== 0 && (s1.filter.categoryBits & s2.filter.maskBits) !== 0;
  }
  /** The bounds a shape covered over the current sweep, as b2Shape.Synchronize. */
  sweptAABB(shape) {
    const body = shape.body;
    const now = shape.computeAABB(body.xf);
    if (body.isStatic) return now;
    const then = shape.computeAABB(body.sweepStartXForm(this.scratchXF));
    return {
      lx: Math.min(now.lx, then.lx),
      ly: Math.min(now.ly, then.ly),
      ux: Math.max(now.ux, then.ux),
      uy: Math.max(now.uy, then.uy)
    };
  }
  /**
   * The broad phase. 2.0.2 runs this twice per step in effect: once inside
   * `b2ContactManager.Collide`, and again as `SynchronizeShapes` moves each
   * proxy after integration — which is what creates the pair a fast body needs
   * before `SolveTOI` looks for it.
   */
  refreshPairs(margin = 2) {
    const active = [];
    for (const body of this.bodies) {
      for (const shape of body.shapes) active.push(shape);
    }
    const boxes = active.map((s) => this.sweptAABB(s));
    const seen = /* @__PURE__ */ new Set();
    for (let i = 0; i < active.length; i++) {
      const s1 = active[i];
      const a1 = boxes[i];
      for (let j = i + 1; j < active.length; j++) {
        const s2 = active[j];
        if (!this.shouldCollide(s1, s2)) continue;
        const a2 = boxes[j];
        if (a1.ux + margin < a2.lx || a2.ux + margin < a1.lx || a1.uy + margin < a2.ly || a2.uy + margin < a1.ly) {
          continue;
        }
        const flip = s1.type === "circle" && s2.type === "polygon";
        const first = flip ? s2 : s1;
        const second = flip ? s1 : s2;
        const key = `${this.idOf(first)}:${this.idOf(second)}`;
        seen.add(key);
        if (!this.contacts.has(key)) {
          this.contacts.set(key, new Contact(first, second));
        }
      }
    }
    for (const [key] of this.contacts) {
      if (!seen.has(key)) this.contacts.delete(key);
    }
  }
  /**
   * `b2Contact.Update` takes the listener and `Evaluate` calls `listener.Add`
   * on it, so in 2.0.2 **every** Update is a chance to raise a begin-contact —
   * including the one `SolveTOI` makes after rewinding a pair to its moment of
   * impact. Reporting only the pre-solve pass drops exactly the hardest hits.
   */
  publishBegan(contact) {
    if (!contact.began) return;
    this.beganContacts.push({
      body1: contact.body1,
      body2: contact.body2,
      velocity: contactPointVelocity(contact)
    });
  }
  /** b2ContactManager.Collide's second half: re-evaluate every live manifold. */
  updateContacts() {
    for (const contact of this.contacts.values()) {
      const b1 = contact.body1;
      const b2 = contact.body2;
      if (b1.sleeping && b2.sleeping) continue;
      contact.update();
      this.publishBegan(contact);
    }
  }
  /** b2World.Step(dt, velocityIterations, positionIterations). */
  step(dt, velocityIterations, positionIterations) {
    const step = {
      dt,
      inv_dt: dt > 0 ? 1 / dt : 0,
      dtRatio: this.inv_dt0 * dt,
      velocityIterations,
      positionIterations,
      warmStarting: this.warmStarting
    };
    this.beganContacts.length = 0;
    this.refreshPairs();
    this.updateContacts();
    if (dt > 0) this.solve(step);
    if (this.continuousPhysics && dt > 0) {
      this.refreshPairs();
      this.solveTOI(step);
    }
    this.inv_dt0 = step.inv_dt;
  }
  /**
   * b2World.SolveTOI. Walks the step forward one time-of-impact at a time,
   * rewinding the pair that touches first and re-solving from there, so nothing
   * passes through a static body between sub-steps.
   *
   * `Contact.slow` keeps dynamic/dynamic pairs out of this, exactly as 2.0.2's
   * `e_slowFlag` does — so a boot never gets TOI treatment against the ball.
   */
  solveTOI(step) {
    for (const body of this.bodies) {
      body.islandFlag = false;
      body.sweep.t0 = 0;
    }
    for (const contact of this.contacts.values()) {
      contact.toiFlag = false;
      contact.islandFlag = false;
    }
    const jointFlags = /* @__PURE__ */ new Set();
    for (; ; ) {
      let earliest = null;
      let minTOI = 1;
      for (const contact of this.contacts.values()) {
        if (contact.slow) continue;
        let toi = 1;
        if (contact.toiFlag) {
          toi = contact.toi;
        } else {
          const b12 = contact.body1;
          const b22 = contact.body2;
          if ((b12.isStatic || b12.sleeping) && (b22.isStatic || b22.sleeping)) continue;
          let t0 = b12.sweep.t0;
          if (b12.sweep.t0 < b22.sweep.t0) {
            t0 = b22.sweep.t0;
            b12.sweep.advance(t0);
          } else if (b22.sweep.t0 < b12.sweep.t0) {
            t0 = b12.sweep.t0;
            b22.sweep.advance(t0);
          }
          toi = timeOfImpact(contact.shape1, b12.sweep, contact.shape2, b22.sweep);
          if (toi > 0 && toi < 1) {
            toi = (1 - toi) * t0 + toi;
            if (toi > 1) toi = 1;
          }
          contact.toi = toi;
          contact.toiFlag = true;
        }
        if (Number.MIN_VALUE < toi && toi < minTOI) {
          earliest = contact;
          minTOI = toi;
        }
      }
      if (earliest === null || 1 - 100 * Number.MIN_VALUE < minTOI) break;
      const b1 = earliest.body1;
      const b2 = earliest.body2;
      b1.advance(minTOI);
      b2.advance(minTOI);
      earliest.update();
      this.publishBegan(earliest);
      earliest.toiFlag = false;
      if (earliest.manifold.pointCount === 0) continue;
      const seed = b1.isStatic ? b2 : b1;
      const contactsOf = this.contactAdjacency();
      const jointsOf = this.jointAdjacency();
      const islandBodies = [];
      const islandContacts = [];
      const islandJoints = [];
      const stack = [seed];
      seed.islandFlag = true;
      while (stack.length > 0) {
        const body = stack.pop();
        islandBodies.push(body);
        body.sleeping = false;
        if (body.isStatic) continue;
        for (const contact of contactsOf.get(body) ?? []) {
          if (contact.islandFlag || contact.slow) continue;
          if (contact.manifold.pointCount === 0) continue;
          contact.islandFlag = true;
          islandContacts.push(contact);
          const other = contact.body1 === body ? contact.body2 : contact.body1;
          if (!other.islandFlag) {
            if (!other.isStatic) {
              other.advance(minTOI);
              other.wakeUp();
            }
            other.islandFlag = true;
            stack.push(other);
          }
        }
        for (const joint of jointsOf.get(body) ?? []) {
          if (jointFlags.has(joint)) continue;
          jointFlags.add(joint);
          islandJoints.push(joint);
          const other = joint.body1 === body ? joint.body2 : joint.body1;
          if (!other.islandFlag) {
            if (!other.isStatic) {
              other.advance(minTOI);
              other.wakeUp();
            }
            other.islandFlag = true;
            stack.push(other);
          }
        }
      }
      const subStep = {
        dt: (1 - minTOI) * step.dt,
        inv_dt: 0,
        dtRatio: 0,
        velocityIterations: step.velocityIterations,
        positionIterations: step.positionIterations,
        warmStarting: false
      };
      subStep.inv_dt = subStep.dt > 0 ? 1 / subStep.dt : 0;
      this.solveIslandTOI(subStep, islandBodies, islandContacts, islandJoints);
      for (const body of islandBodies) {
        body.islandFlag = false;
        if (body.isStatic) continue;
        for (const contact of contactsOf.get(body) ?? []) contact.toiFlag = false;
      }
      for (const contact of islandContacts) {
        contact.toiFlag = false;
        contact.islandFlag = false;
      }
      for (const joint of islandJoints) jointFlags.delete(joint);
    }
  }
  /**
   * b2Island.SolveTOI: velocity then position, with a stiffer 0.75 Baumgarte
   * and warm starting forced on inside the contact solver.
   *
   * Note the original really does call the joints' `InitVelocityConstraints`
   * inside the velocity-iteration loop where `SolveVelocityConstraints` was
   * meant to go. Reproduced, because the joint would otherwise be solved by a
   * different rule here than in the main solve.
   */
  solveIslandTOI(step, bodies, contacts, joints) {
    const solver = new ContactSolver(step, contacts);
    const warmStep = { ...step, warmStarting: true };
    for (const joint of joints) joint.initVelocityConstraints(warmStep);
    for (let i = 0; i < step.velocityIterations; i++) {
      solver.solveVelocityConstraints();
      for (const joint of joints) joint.initVelocityConstraints(warmStep);
    }
    for (const b of bodies) {
      if (b.isStatic) continue;
      b.sweep.c0.setV(b.sweep.c);
      b.sweep.a0 = b.sweep.a;
      b.sweep.c.x += step.dt * b.linearVelocity.x;
      b.sweep.c.y += step.dt * b.linearVelocity.y;
      b.sweep.a += step.dt * b.angularVelocity;
      b.synchronizeTransform();
    }
    const k_toiBaumgarte = 0.75;
    for (let i = 0; i < step.positionIterations; i++) {
      const contactsOk = solver.solvePositionConstraints(k_toiBaumgarte);
      let jointsOk = true;
      for (const joint of joints) {
        jointsOk = joint.solvePositionConstraints() && jointsOk;
      }
      if (contactsOk && jointsOk) break;
    }
  }
  contactAdjacency() {
    const map = /* @__PURE__ */ new Map();
    for (const contact of this.contacts.values()) {
      push(map, contact.body1, contact);
      push(map, contact.body2, contact);
    }
    return map;
  }
  jointAdjacency() {
    const map = /* @__PURE__ */ new Map();
    for (const joint of this.joints) {
      push(map, joint.body1, joint);
      push(map, joint.body2, joint);
    }
    return map;
  }
  solve(step) {
    for (const body of this.bodies) body.islandFlag = false;
    for (const contact of this.contacts.values()) contact.islandFlag = false;
    const jointFlags = /* @__PURE__ */ new Set();
    const contactsOf = /* @__PURE__ */ new Map();
    for (const contact of this.contacts.values()) {
      if (contact.manifold.pointCount === 0) continue;
      push(contactsOf, contact.body1, contact);
      push(contactsOf, contact.body2, contact);
    }
    const jointsOf = /* @__PURE__ */ new Map();
    for (const joint of this.joints) {
      push(jointsOf, joint.body1, joint);
      push(jointsOf, joint.body2, joint);
    }
    for (const seed of this.bodies) {
      if (seed.islandFlag) continue;
      if (seed.sleeping) continue;
      if (seed.isStatic) continue;
      const islandBodies = [];
      const islandContacts = [];
      const islandJoints = [];
      const stack = [seed];
      seed.islandFlag = true;
      while (stack.length > 0) {
        const body = stack.pop();
        islandBodies.push(body);
        body.wakeUp();
        if (body.isStatic) continue;
        for (const contact of contactsOf.get(body) ?? []) {
          if (contact.islandFlag) continue;
          contact.islandFlag = true;
          islandContacts.push(contact);
          const other = contact.body1 === body ? contact.body2 : contact.body1;
          if (!other.islandFlag) {
            other.islandFlag = true;
            stack.push(other);
          }
        }
        for (const joint of jointsOf.get(body) ?? []) {
          if (jointFlags.has(joint)) continue;
          jointFlags.add(joint);
          islandJoints.push(joint);
          const other = joint.body1 === body ? joint.body2 : joint.body1;
          if (!other.islandFlag) {
            other.islandFlag = true;
            stack.push(other);
          }
        }
      }
      this.solveIsland(step, islandBodies, islandContacts, islandJoints);
      for (const body of islandBodies) {
        if (body.isStatic) body.islandFlag = false;
      }
    }
  }
  /** b2Island.Solve. */
  solveIsland(step, bodies, contacts, joints) {
    for (const b of bodies) {
      if (b.isStatic) continue;
      b.linearVelocity.x += step.dt * (this.gravity.x + b.invMass * b.force.x);
      b.linearVelocity.y += step.dt * (this.gravity.y + b.invMass * b.force.y);
      b.angularVelocity += step.dt * b.invI * b.torque;
      b.force.setZero();
      b.torque = 0;
      if (b.linearVelocity.lengthSquared() > b2_maxLinearVelocitySquared) {
        b.linearVelocity.normalize();
        b.linearVelocity.x *= b2_maxLinearVelocity;
        b.linearVelocity.y *= b2_maxLinearVelocity;
      }
      if (b.angularVelocity * b.angularVelocity > b2_maxAngularVelocitySquared) {
        b.angularVelocity = b.angularVelocity < 0 ? -b2_maxAngularVelocity : b2_maxAngularVelocity;
      }
    }
    const solver = new ContactSolver(step, contacts);
    solver.initVelocityConstraints(step);
    for (const joint of joints) joint.initVelocityConstraints(step);
    for (let i = 0; i < step.velocityIterations; i++) {
      for (const joint of joints) joint.solveVelocityConstraints(step);
      solver.solveVelocityConstraints();
    }
    solver.finalizeVelocityConstraints();
    for (const b of bodies) {
      if (b.isStatic) continue;
      b.sweep.c0.setV(b.sweep.c);
      b.sweep.a0 = b.sweep.a;
      b.sweep.c.x += step.dt * b.linearVelocity.x;
      b.sweep.c.y += step.dt * b.linearVelocity.y;
      b.sweep.a += step.dt * b.angularVelocity;
      b.synchronizeTransform();
    }
    for (let i = 0; i < step.positionIterations; i++) {
      const contactsOk = solver.solvePositionConstraints(b2_contactBaumgarte);
      let jointsOk = true;
      for (const joint of joints) {
        jointsOk = joint.solvePositionConstraints() && jointsOk;
      }
      if (contactsOk && jointsOk) break;
    }
    if (!this.allowSleep) return;
    let minSleepTime = Number.MAX_VALUE;
    const linTolSqr = b2_linearSleepTolerance * b2_linearSleepTolerance;
    const angTolSqr = b2_angularSleepTolerance * b2_angularSleepTolerance;
    for (const b of bodies) {
      if (b.invMass === 0) continue;
      if (!b.allowSleep || b.angularVelocity * b.angularVelocity > angTolSqr || b.linearVelocity.lengthSquared() > linTolSqr) {
        b.sleepTime = 0;
        minSleepTime = 0;
      } else {
        b.sleepTime += step.dt;
        minSleepTime = Math.min(minSleepTime, b.sleepTime);
      }
    }
    if (minSleepTime >= b2_timeToSleep) {
      for (const b of bodies) b.putToSleep();
    }
  }
  /** Largest distance any body moves in one sub-step; a tunnelling canary. */
  maxSubStepTranslation(dt) {
    let max = 0;
    for (const b of this.bodies) {
      max = Math.max(max, b.linearVelocity.length() * dt);
    }
    return max;
  }
};
function push(map, key, value) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}
function contactPointVelocity(contact) {
  const mp = contact.manifold.points[0];
  const b1 = contact.body1;
  const b2 = contact.body2;
  const v1 = velocityAtLocalPoint(b1, mp.localPoint1.x, mp.localPoint1.y);
  const v2 = velocityAtLocalPoint(b2, mp.localPoint2.x, mp.localPoint2.y);
  return new Vec2(v2.x - v1.x, v2.y - v1.y);
}
function velocityAtLocalPoint(body, lx, ly) {
  const R = body.xf.R;
  const wx = body.xf.position.x + (R.col1.x * lx + R.col2.x * ly);
  const wy = body.xf.position.y + (R.col1.y * lx + R.col2.y * ly);
  const rx = wx - body.sweep.c.x;
  const ry = wy - body.sweep.c.y;
  return new Vec2(
    body.linearVelocity.x - body.angularVelocity * ry,
    body.linearVelocity.y + body.angularVelocity * rx
  );
}

// src/physics/b2/shapes.ts
var Shape = class {
  type;
  density;
  friction;
  restitution;
  filter;
  /** Back-reference, filled in by Body.createShape. */
  body = null;
  constructor(type, def) {
    this.type = type;
    this.density = def.density;
    this.friction = def.friction;
    this.restitution = def.restitution;
    this.filter = {
      categoryBits: 1,
      maskBits: 65535,
      groupIndex: def.groupIndex
    };
  }
  /**
   * Distance from the body's centre of mass to the furthest point of the CORE
   * shape. `b2TimeOfImpact` uses it to bound how far rotation can move a point.
   */
  sweepRadius = 0;
};
var CircleShape = class extends Shape {
  localPosition = new Vec2();
  radius;
  constructor(def) {
    super("circle", def);
    this.radius = def.radius;
  }
  computeMass(out) {
    out.mass = this.density * Math.PI * this.radius * this.radius;
    out.center.setV(this.localPosition);
    out.I = out.mass * (0.5 * this.radius * this.radius + (this.localPosition.x * this.localPosition.x + this.localPosition.y * this.localPosition.y));
  }
  computeAABB(xf) {
    const R = xf.R;
    const p = this.localPosition;
    const cx = xf.position.x + (R.col1.x * p.x + R.col2.x * p.y);
    const cy = xf.position.y + (R.col1.y * p.x + R.col2.y * p.y);
    return {
      lx: cx - this.radius,
      ly: cy - this.radius,
      ux: cx + this.radius,
      uy: cy + this.radius
    };
  }
  updateSweepRadius(localCenter) {
    const dx = this.localPosition.x - localCenter.x;
    const dy = this.localPosition.y - localCenter.y;
    this.sweepRadius = Math.sqrt(dx * dx + dy * dy) + this.radius - b2_toiSlop;
  }
  /** A circle's core shape is a point at its centre. */
  support(xf) {
    return this.getFirstVertex(xf);
  }
  getFirstVertex(xf) {
    const R = xf.R;
    const p = this.localPosition;
    return new Vec2(
      xf.position.x + (R.col1.x * p.x + R.col2.x * p.y),
      xf.position.y + (R.col1.y * p.x + R.col2.y * p.y)
    );
  }
};
var PolygonShape = class _PolygonShape extends Shape {
  vertices = [];
  normals = [];
  /** Vertices pulled in by b2_toiSlop; only the TOI/distance code sees these. */
  coreVertices = [];
  centroid = new Vec2();
  vertexCount = 0;
  constructor(def) {
    super("polygon", def);
    this.vertexCount = def.vertices.length;
    for (const v of def.vertices) this.vertices.push(v.copy());
    for (let i = 0; i < this.vertexCount; i++) {
      const i1 = i;
      const i2 = i + 1 < this.vertexCount ? i + 1 : 0;
      const ex = this.vertices[i2].x - this.vertices[i1].x;
      const ey = this.vertices[i2].y - this.vertices[i1].y;
      const len = Math.sqrt(ex * ex + ey * ey);
      this.normals.push(new Vec2(ey / len, -ex / len));
    }
    this.centroid = _PolygonShape.computeCentroid(this.vertices, this.vertexCount);
    for (let i = 0; i < this.vertexCount; i++) {
      const i1 = i - 1 >= 0 ? i - 1 : this.vertexCount - 1;
      const i2 = i;
      const n1 = this.normals[i1];
      const n2 = this.normals[i2];
      const vx = this.vertices[i].x - this.centroid.x;
      const vy = this.vertices[i].y - this.centroid.y;
      const d1 = n1.x * vx + n1.y * vy - b2_toiSlop;
      const d2 = n2.x * vx + n2.y * vy - b2_toiSlop;
      const det = 1 / (n1.x * n2.y - n1.y * n2.x);
      this.coreVertices.push(
        new Vec2(
          det * (n2.y * d1 - n1.y * d2) + this.centroid.x,
          det * (n1.x * d2 - n2.x * d1) + this.centroid.y
        )
      );
    }
  }
  /** b2PolygonDef.SetAsBox: hx/hy half-extents, CCW in Box2D's frame. */
  static box(hx, hy, def) {
    return new _PolygonShape({
      ...def,
      vertices: [
        new Vec2(-hx, -hy),
        new Vec2(hx, -hy),
        new Vec2(hx, hy),
        new Vec2(-hx, hy)
      ]
    });
  }
  static computeCentroid(vs, count) {
    const c = new Vec2();
    let area = 0;
    const inv3 = 1 / 3;
    const p1x = 0;
    const p1y = 0;
    for (let i = 0; i < count; i++) {
      const p2 = vs[i];
      const p3 = i + 1 < count ? vs[i + 1] : vs[0];
      const e1x = p2.x - p1x;
      const e1y = p2.y - p1y;
      const e2x = p3.x - p1x;
      const e2y = p3.y - p1y;
      const d = e1x * e2y - e1y * e2x;
      const triangleArea = 0.5 * d;
      area += triangleArea;
      c.x += triangleArea * inv3 * (p1x + p2.x + p3.x);
      c.y += triangleArea * inv3 * (p1y + p2.y + p3.y);
    }
    c.x *= 1 / area;
    c.y *= 1 / area;
    return c;
  }
  computeMass(out) {
    let centerX = 0;
    let centerY = 0;
    let area = 0;
    let I = 0;
    const inv3 = 1 / 3;
    for (let i = 0; i < this.vertexCount; i++) {
      const p2 = this.vertices[i];
      const p3 = i + 1 < this.vertexCount ? this.vertices[i + 1] : this.vertices[0];
      const e1x = p2.x;
      const e1y = p2.y;
      const e2x = p3.x;
      const e2y = p3.y;
      const d = e1x * e2y - e1y * e2x;
      const triangleArea = 0.5 * d;
      area += triangleArea;
      centerX += triangleArea * inv3 * (p2.x + p3.x);
      centerY += triangleArea * inv3 * (p2.y + p3.y);
      const intx2 = inv3 * (0.25 * (e1x * e1x + e2x * e1x + e2x * e2x));
      const inty2 = inv3 * (0.25 * (e1y * e1y + e2y * e1y + e2y * e2y));
      I += d * (intx2 + inty2);
    }
    out.mass = this.density * area;
    centerX *= 1 / area;
    centerY *= 1 / area;
    out.center.set(centerX, centerY);
    out.I = this.density * I;
  }
  computeAABB(xf) {
    let lx = Number.MAX_VALUE;
    let ly = Number.MAX_VALUE;
    let ux = -Number.MAX_VALUE;
    let uy = -Number.MAX_VALUE;
    const R = xf.R;
    for (let i = 0; i < this.vertexCount; i++) {
      const v = this.vertices[i];
      const x = xf.position.x + (R.col1.x * v.x + R.col2.x * v.y);
      const y = xf.position.y + (R.col1.y * v.x + R.col2.y * v.y);
      if (x < lx) lx = x;
      if (y < ly) ly = y;
      if (x > ux) ux = x;
      if (y > uy) uy = y;
    }
    return { lx, ly, ux, uy };
  }
  updateSweepRadius(localCenter) {
    this.sweepRadius = 0;
    for (let i = 0; i < this.vertexCount; i++) {
      const v = this.coreVertices[i];
      const dx = v.x - localCenter.x;
      const dy = v.y - localCenter.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > this.sweepRadius) this.sweepRadius = d;
    }
  }
  support(xf, dx, dy) {
    const R = xf.R;
    const lx = dx * R.col1.x + dy * R.col1.y;
    const ly = dx * R.col2.x + dy * R.col2.y;
    let best = 0;
    let bestValue = this.coreVertices[0].x * lx + this.coreVertices[0].y * ly;
    for (let i = 1; i < this.vertexCount; i++) {
      const v2 = this.coreVertices[i];
      const value = v2.x * lx + v2.y * ly;
      if (value > bestValue) {
        best = i;
        bestValue = value;
      }
    }
    const v = this.coreVertices[best];
    return new Vec2(
      xf.position.x + (R.col1.x * v.x + R.col2.x * v.y),
      xf.position.y + (R.col1.y * v.x + R.col2.y * v.y)
    );
  }
  getFirstVertex(xf) {
    const R = xf.R;
    const v = this.coreVertices[0];
    return new Vec2(
      xf.position.x + (R.col1.x * v.x + R.col2.x * v.y),
      xf.position.y + (R.col1.y * v.x + R.col2.y * v.y)
    );
  }
};

// src/game/constants.ts
var STAGE_WIDTH = 800;
var STAGE_HEIGHT = 480;
var GROUND_TOP = 460;
var GRAVITY_X = 0;
var GRAVITY_Y = 300;
var TIME_STEP = 1 / 96;
var SOLVER_ITERATIONS = 48;
var STEPS_PER_TICK = 3;
var TICK_HZ = 30;
var TICK_SECONDS = 1 / TICK_HZ;
var PHYSICS_SECONDS_PER_TICK = STEPS_PER_TICK * TIME_STEP;
var GROUP_DEFAULT = 0;
var GROUP_LEG_AND_GROUND = -1;
var BALL = {
  /** Density of the kick-off ball (initLevel). */
  density: 1.5,
  /**
   * Density of a ball respawned by a size/bounce power-up (updateBall). The
   * original really does use a different value here.
   */
  powerUpDensity: 0.6,
  friction: 1,
  group: GROUP_DEFAULT,
  spawnX: STAGE_WIDTH / 2,
  spawnY: 230,
  /**
   * Kick-off velocity. The original is (-150 + random*300, -100): a random
   * side and a random distance. **A deliberate departure (user, 2026-10-20):**
   * the side is no longer random. The match's first ball goes straight up and
   * down (x 0), and after a goal the ball is served towards the end that
   * conceded, with the distance still random — speed `random*150`, the same
   * spread as before folded onto one side. `roll` is the random number in
   * [0, 1), drawn from the match's seeded dice (and drawn on the first ball
   * too, so the dice stream is the same either way).
   */
  spawnVelX: (roll, serveTo) => serveTo === null ? 0 : (serveTo === "left" ? -1 : 1) * roll * 150,
  spawnVelY: -100
};
var ballRadius = (puSize) => 5 + puSize * 5;
var ballRestitution = (puBouncy) => 0.3 + puBouncy * 0.3;
var HEAD = {
  /** Radius at normal size; the size power-ups scale this by 0.5 / 1 / 1.5. */
  radius: 19,
  density: 100,
  friction: 0,
  restitution: 0.01,
  group: GROUP_DEFAULT,
  restY: GROUND_TOP - 19,
  // 441
  /** Height of the face artwork, used by the original's ground check. */
  artHeight: 50
};
var LEG = {
  width: 40,
  height: 10,
  density: 2,
  friction: 0.5,
  restitution: 1,
  group: GROUP_LEG_AND_GROUND,
  /** Leg body centre relative to the head centre at spawn, mirrored per side. */
  offsetX: 4,
  offsetY: 15.6,
  /** Leg body angle at spawn is PI + mirror * this. */
  spawnAngleFromPi: 1.37,
  maxMotorTorque: 1e8
};
var LEG_TARGETS = {
  right: {
    idle: -(Math.PI - 1.2 - 1.67),
    // -0.27159...
    kick: 0.2 + 1.67
    //  1.87
  },
  left: {
    idle: -(-0.2 - Math.PI / 2 + 1.67),
    //  0.10080...
    kick: -(Math.PI - 1.2 - Math.PI / 2 + 1.67)
    // -2.04080...
  }
};
var LEG_IDLE_GAIN = 6;
var LEG_KICK_GAIN = 12;
var MOVE = {
  /**
   * Per-tick run acceleration is `50 + upgrade*30 + PUSpeed*30`. There are no
   * career upgrades in local 1v1, and PUSpeed defaults to 1, so the baseline is
   * 80 — not 50. Getting this wrong makes the game feel sluggish.
   */
  baseAccel: 50,
  accelPerSpeedLevel: 30,
  /** Multiplied into the speed accumulator every tick. */
  damping: 0.7,
  /** Jump velocity is `-150 + PUJump * -50`; PUJump defaults to 1 => -200. */
  baseJump: -150,
  jumpPerLevel: -50,
  /** Added to vertical velocity every tick, on top of world gravity. */
  extraFallPerTick: 5,
  /** The original only clamped rightward movement. */
  maxX: 720
};
var runAccel = (puSpeed) => MOVE.baseAccel + puSpeed * MOVE.accelPerSpeedLevel;
var jumpVelocity = (puJump) => MOVE.baseJump + puJump * MOVE.jumpPerLevel;
var HEAD_BOUNCE = {
  maxDx: 30,
  maxDy: 45,
  minFallSpeed: 1
};
var SYMMETRIC_HEAD_BOUNCE = false;
var STATIC_BOXES = [
  { x: -5, y: 240, w: 20, h: 480 },
  { x: 805, y: 240, w: 20, h: 480 },
  { x: 400, y: -5, w: 800, h: 20 },
  { x: 50, y: 50, w: 60, h: 200, angle: 45 },
  { x: 750, y: 50, w: 60, h: 200, angle: -45 },
  { x: -20, y: 240, w: 60, h: 520, angle: 8 },
  { x: 820, y: 240, w: 60, h: 520, angle: -8 },
  { x: 240, y: -20, w: 520, h: 60, angle: -8 },
  { x: 560, y: -20, w: 520, h: 60, angle: 8 }
];
var GOAL_POST = { w: 80, h: 10, leftX: 40, rightX: 760 };
var GROUND_BOX = { x: 400, y: 470, w: 800, h: 20 };
var GOAL_SIZES = {
  normal: { postY: 345, mouthTop: 360, mouthHeight: 100 },
  big: { postY: 305, mouthTop: 320, mouthHeight: 140 },
  small: { postY: 385, mouthTop: 400, mouthHeight: 60 }
};
var GOAL_ZONE_X = {
  left: { min: -5.5, max: 64.5 },
  right: { min: 735, max: 805 }
};
var GOAL_ROOF = {
  left: { minX: 0, maxX: 70 },
  right: { minX: 720, maxX: 790 },
  height: 100,
  topY: { normal: 330, big: 290, small: 370 },
  /** Added to the ball's x velocity per tick, away from the goal. */
  nudge: 2
};
var SPAWN_LEFT_X = 200;
var SPAWN_RIGHT_X = 600;
var POWERUP = {
  /** A new power-up drops every 200 ticks. */
  spawnEveryTicks: 200,
  /** Spawn box: x = 220 + rand*360, y = 150 + rand*270. */
  spawnMinX: 220,
  spawnRangeX: 360,
  spawnMinY: 150,
  spawnRangeY: 270,
  /** Ticks a dropped power-up stays on the pitch. */
  lifetimeTicks: 600,
  /** Ball-to-power-up pickup distance. */
  pickupDistance: 35,
  /**
   * How much room a dropped pick-up wants around it, and how many times the
   * spawner will re-roll to find it.
   *
   * Not from the original — it dropped power-ups blind and they routinely
   * landed inside an obstacle, where the icon is half-hidden and the ball
   * cannot reach the middle of it. 28 is the radius of the original's icon
   * graphic (the SWF's 56x56 bounds; see CLAUDE.md queue #5) — our coins are
   * smaller (48px), so a cleared spot always shows the whole icon. On a crowded layout no point may qualify, so the
   * spawner keeps the roomiest candidate it saw rather than skipping the drop.
   */
  clearance: 28,
  spawnAttempts: 24,
  /**
   * Ticks a new pick-up waits before the ball can collect it (~1 s).
   *
   * Not from the original — there a drop was live on the tick it appeared, so
   * a ball already in flight could swallow one the instant it spawned in its
   * path, good or bad, with neither player able to do a thing about it. The
   * user asked for that to go. Derived from `ticksLeft` (see `isArmed`), so it
   * adds no state.
   */
  armTicks: 30,
  /**
   * How far from the ball's centre a drop must land. Also ours: with only the
   * arming delay, a coin could still spawn under a ball sitting still and be
   * collected the moment it armed, by nobody's doing.
   */
  ballClearance: 100
};
var PU_DURATION = {
  speed: 200,
  jump: 200,
  ice: 200,
  goalSize: 600,
  playerSize: 600,
  breakLegHero: 200,
  breakLegOpp: 400,
  fire: 700,
  ballSize: 400,
  ballBouncy: 200,
  streaker: 1e3
};
var PLAYER_SIZE_SCALE = { small: 0.5, normal: 1, big: 1.5 };
var BOMB_DROP_TICKS = [1, 40, 80];
var BOMB = {
  spawnY: 50,
  spawnMinX: 20,
  spawnRangeX: 760,
  /** Bomb.Update: yspeed += 0.2; y += yspeed; explodes at y >= 470. */
  gravityPerTick: 0.2,
  groundY: 470,
  /** Blast radius against a player's centre. */
  blastRadius: 50
};
var STREAKER = {
  /** The original streaker graphic occupies a 50x50 area. */
  artSize: 50,
  radius: 20,
  density: 100,
  friction: 0,
  restitution: 0.01,
  spawnX: 400,
  spawnY: 300,
  /** Wanders between random x targets at this speed. */
  walkSpeed: 100,
  /** Hops when it reaches the ground. */
  hopVelocity: -300,
  retargetDistance: 10,
  targetMinX: 100,
  targetRangeX: 600
};
var BOOT_ART = {
  right: { offsetX: (0.25 + 17.95) / 2, offsetY: (-9.55 + 8.8) / 2 },
  // 9.10, -0.375
  left: { offsetX: (-15.75 + 1.95) / 2, offsetY: (-9.55 + 8.8) / 2 }
  // -6.90, -0.375
};
var BACKDROP_ART = {
  x: -44.5 + 4.45,
  // -40.05
  y: -5.9 - 25.1,
  // -31.0
  width: 840.75 - -44.5,
  // 885.25
  height: 482.75 - -5.9
  // 488.65
};
var GOAL_ART = {
  width: 80.5 - -0.5,
  // 81
  height: 121.5 - -42,
  // 163.5
  /** Top-left of the left goal's artwork. */
  leftX: -0.5,
  /** The right goal is the same clip mirrored about x = 800. */
  rightX: 800 - 80.5,
  // 719.5
  y: 340 - 42
  // 298
};
var KICK_SOUND_MIN_SPEED = 200;
var GOAL_CELEBRATION_TICKS = 22;
var COUNTDOWN_TICKS = 88;
var TICKS_PER_MATCH_SECOND = 30;
var teamOf = (slot) => slot === "p1" || slot === "p1b" ? "p1" : "p2";
var TWO_V_TWO = {
  /**
   * The boundary: the two upright side walls, the ceiling and its two shallow
   * slants, from `STATIC_BOXES`. Left out are the 45-degree top-corner wedges
   * and the 8-degree side slants: in a goal this tall both of them reach into
   * the mouth (the side slant stands at x~25 by the crossbar, the wedge's
   * underside crosses it), so a player carried up by the lift would be shoved
   * out of the goal by the wall before reaching the bar.
   */
  walls: [STATIC_BOXES[0], STATIC_BOXES[1], STATIC_BOXES[2], STATIC_BOXES[7], STATIC_BOXES[8]],
  /**
   * The tall goal: the mouth spans both levels. Same 80x10 crossbar and the
   * same scoring-zone x range as 1v1 (`GOAL_ZONE_X`), only taller — 324 px,
   * the first proposal's 360 less 10% (user, 2026-10-16). Goal-size power-ups
   * are excluded from 2v2, so there is one size.
   */
  goal: { postY: 131, mouthTop: 136, mouthHeight: 324 },
  /**
   * The roof nudge's zone, y only (x as `GOAL_ROOF`). It sits wholly above the
   * crossbar (bar top 126): a ball resting on the bar is in it, a ball in the
   * top of the mouth is not. The 1v1 zone overlaps its mouth; that is the
   * original's authoring and is not copied here.
   */
  roof: { topY: 56, height: 72 },
  /**
   * Platform top and thickness; both sides share them. The top is 162 px above
   * the pitch — the first proposal's 180, shortened by the same 10% as the goal.
   */
  platformTop: 298,
  platformThickness: 10,
  /**
   * One solid platform on each side — the ball and players land on it and
   * cannot pass through it in either direction (user, 2026-10-16: no one-way
   * part). The 140 px gap in the middle is the only way between the levels
   * besides the goal lifts. Mirrored about x = 400.
   */
  platforms: [
    { minX: 70, maxX: 330 },
    { minX: 470, maxX: 730 }
  ],
  /**
   * The goal lift: a head whose centre is in a goal's column, between the
   * crossbar and the ground, has its vertical speed set to `speed` every tick.
   * The column stops short of the platform end (x 70 / 730) by more than a
   * head's radius, so a lifted head rises past the platform rather than into
   * its underside — it ends up pressed against the crossbar until its player
   * steps forward and drops onto the platform.
   */
  lift: {
    left: { minX: 0, maxX: 50 },
    right: { minX: 750, maxX: 800 },
    topY: 136,
    bottomY: 460,
    /** px/s, upwards. A normal jump launches at 200. */
    speed: -160
  },
  /**
   * Kick-off spots: one player per team on the ground, one on that team's
   * platform (`HEAD.restY` there is platformTop - radius).
   */
  spawns: {
    p1: { x: 200, y: GROUND_TOP - 19 },
    p2: { x: 600, y: GROUND_TOP - 19 },
    p1b: { x: 200, y: 298 - 19 },
    p2b: { x: 600, y: 298 - 19 }
  },
  /**
   * The original clamps only *rightward* running at x = 720 (`MOVE.maxX`),
   * which in 1v1 just stops a player walking deep into the right-hand goal.
   * In 2v2 the right goal's lift is at x >= 750 and that clamp would make it
   * unreachable on foot for everybody, so 2v2 lifts it to the stage edge (the
   * wall stops you anyway).
   */
  maxRunX: STAGE_WIDTH
};
var TWO_V_TWO_ART = {
  goal: {
    width: 81,
    height: 344,
    leftX: -0.5,
    rightX: STAGE_WIDTH - 80.5,
    /** The canvas top: crossbar top (postY - 5) less the art's top margin. */
    y: 131 - 5 - 8
  },
  fan: {
    width: 48,
    height: 12,
    frames: 3,
    /** Frames per second the slats step at — reads as a spinning blade. */
    fps: 18,
    /** Centre x of each fan: the middle of its lift column. */
    leftX: 25,
    rightX: STAGE_WIDTH - 25,
    /** The housing's foot sits 1px into the pitch surface. */
    bottom: GROUND_TOP + 1
  }
};

// src/game/goal.ts
function overlaps(ball, x0, x1, y0, y1) {
  return ball.x + ball.radius > x0 && ball.x - ball.radius < x1 && ball.y + ball.radius > y0 && ball.y - ball.radius < y1;
}
function detectGoal(ball, leftSize, rightSize, layout = "1v1") {
  const tall = layout === "2v2" ? TWO_V_TWO.goal : null;
  const left = tall ?? GOAL_SIZES[leftSize];
  if (overlaps(
    ball,
    GOAL_ZONE_X.left.min,
    GOAL_ZONE_X.left.max,
    left.mouthTop,
    left.mouthTop + left.mouthHeight
  )) {
    return "p2";
  }
  const right = tall ?? GOAL_SIZES[rightSize];
  if (overlaps(
    ball,
    GOAL_ZONE_X.right.min,
    GOAL_ZONE_X.right.max,
    right.mouthTop,
    right.mouthTop + right.mouthHeight
  )) {
    return "p1";
  }
  return null;
}
function goalRoofNudge(ball, leftSize, rightSize, layout = "1v1") {
  const onRoof = (zone, size) => {
    if (layout === "2v2") {
      const roof = TWO_V_TWO.roof;
      return overlaps(ball, zone.minX, zone.maxX, roof.topY, roof.topY + roof.height);
    }
    const top = GOAL_ROOF.topY[size];
    return overlaps(ball, zone.minX, zone.maxX, top, top + GOAL_ROOF.height);
  };
  if (onRoof(GOAL_ROOF.left, leftSize)) return GOAL_ROOF.nudge;
  if (onRoof(GOAL_ROOF.right, rightSize)) return -GOAL_ROOF.nudge;
  return 0;
}

// src/game/pitches.json
var pitches_default = {
  _source: "extracted from the original SWF by tools/extract-pitches.py",
  _sprite: "DefineSprite 499 (blueprints)",
  pitches: [
    {
      index: 1,
      props: []
    },
    {
      index: 2,
      props: [
        {
          kind: "block",
          x: 410,
          y: 133,
          rotation: 90.15,
          w: 49,
          h: 25
        },
        {
          kind: "circle",
          x: 410,
          y: 99,
          rotation: 0,
          radius: 19
        },
        {
          kind: "circle",
          x: 410,
          y: 165,
          rotation: 0,
          radius: 19
        }
      ]
    },
    {
      index: 3,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 140,
          rotation: 0,
          radius: 40
        }
      ]
    },
    {
      index: 4,
      props: [
        {
          kind: "circle",
          x: 590,
          y: 200,
          rotation: 0,
          radius: 40
        },
        {
          kind: "circle",
          x: 230,
          y: 200,
          rotation: 0,
          radius: 40
        }
      ]
    },
    {
      index: 5,
      props: [
        {
          kind: "block",
          x: 400,
          y: 30,
          rotation: 0,
          w: 41,
          h: 41
        },
        {
          kind: "circle",
          x: 400,
          y: 55,
          rotation: 0,
          radius: 24
        }
      ]
    },
    {
      index: 6,
      props: [
        {
          kind: "circle",
          x: 670,
          y: 120,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 206,
          y: 160,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 533,
          y: 198,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 600,
          y: 160,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 276,
          y: 200,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 136,
          y: 120,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 7,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 80,
          rotation: 0,
          radius: 25
        },
        {
          kind: "circle",
          x: 580,
          y: 200,
          rotation: 0,
          radius: 25
        },
        {
          kind: "circle",
          x: 220,
          y: 200,
          rotation: 0,
          radius: 25
        }
      ]
    },
    {
      index: 8,
      props: []
    },
    {
      index: 9,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 120,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 469,
          y: 160,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 538,
          y: 200,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 330,
          y: 160,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 261,
          y: 200,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 10,
      props: []
    },
    {
      index: 11,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 5,
          rotation: 0,
          radius: 149
        }
      ]
    },
    {
      index: 12,
      props: []
    },
    {
      index: 13,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 120,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 400,
          y: 190,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 538,
          y: 200,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 260,
          y: 110,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 261,
          y: 200,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 14,
      props: [
        {
          kind: "block",
          x: 550,
          y: 179,
          rotation: 90.15,
          w: 133,
          h: 25
        },
        {
          kind: "block",
          x: 255,
          y: 171,
          rotation: 90.15,
          w: 133,
          h: 25
        }
      ]
    },
    {
      index: 15,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 120,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 653,
          y: 214,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 530,
          y: 140,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 159,
          y: 213,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 280,
          y: 140,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 16,
      props: [
        {
          kind: "circle",
          x: 390,
          y: 60,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 653,
          y: 214,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 610,
          y: 270,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 159,
          y: 213,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 200,
          y: 270,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 17,
      props: [
        {
          kind: "circle",
          x: 450,
          y: 214,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 510,
          y: 290,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 390,
          y: 132,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 330,
          y: 214,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 280,
          y: 290,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 18,
      props: [
        {
          kind: "circle",
          x: 390,
          y: 60,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 510,
          y: 140,
          rotation: 30,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 390,
          y: 180,
          rotation: 0,
          radius: 15
        },
        {
          kind: "block",
          x: 267,
          y: 137,
          rotation: 150,
          w: 133,
          h: 24
        },
        {
          kind: "circle",
          x: 390,
          y: 120,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 19,
      props: [
        {
          kind: "block",
          x: 390,
          y: 110,
          rotation: 150,
          w: 133,
          h: 24
        }
      ]
    },
    {
      index: 20,
      props: [
        {
          kind: "block",
          x: 394,
          y: 111,
          rotation: 32.48,
          w: 133,
          h: 24
        }
      ]
    },
    {
      index: 21,
      props: [
        {
          kind: "circle",
          x: 110,
          y: 70,
          rotation: 0,
          radius: 70
        },
        {
          kind: "circle",
          x: 710,
          y: 80,
          rotation: 0,
          radius: 70
        }
      ]
    },
    {
      index: 22,
      props: [
        {
          kind: "circle",
          x: 400,
          y: 120,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 530,
          y: 140,
          rotation: 0,
          radius: 15
        },
        {
          kind: "circle",
          x: 280,
          y: 140,
          rotation: 0,
          radius: 15
        }
      ]
    },
    {
      index: 23,
      props: []
    },
    {
      index: 24,
      props: []
    },
    {
      index: 25,
      props: []
    },
    {
      index: 26,
      props: []
    }
  ]
};

// src/game/pitches.ts
var ALL = pitches_default.pitches;
var PITCH_COUNT = 22;
function getPitch(index) {
  const clamped = Math.max(1, Math.min(PITCH_COUNT, Math.round(index)));
  return ALL[clamped - 1] ?? { index: clamped, props: [] };
}

// src/game/detmath.ts
function dist(dx, dy) {
  return Math.sqrt(dx * dx + dy * dy);
}

// src/game/rng.ts
var Rng = class {
  a = 0;
  b = 0;
  c = 0;
  d = 0;
  constructor(seed) {
    let s = seed | 0;
    const mix2 = () => {
      s = s + 2654435769 | 0;
      let z = s ^ s >>> 16;
      z = Math.imul(z, 569420461);
      z ^= z >>> 15;
      z = Math.imul(z, 1935289751);
      return z ^ z >>> 15 | 0;
    };
    this.a = mix2();
    this.b = mix2();
    this.c = mix2();
    this.d = mix2();
    for (let i = 0; i < 12; i++) this.next();
  }
  /** A number in [0, 1), like `Math.random()`. */
  next() {
    const t = (this.a + this.b | 0) + this.d | 0;
    this.d = this.d + 1 | 0;
    this.a = this.b ^ this.b >>> 9;
    this.b = this.c + (this.c << 3) | 0;
    this.c = this.c << 21 | this.c >>> 11;
    this.c = this.c + t | 0;
    return (t >>> 0) / 4294967296;
  }
  captureState() {
    return { a: this.a, b: this.b, c: this.c, d: this.d };
  }
  restoreState(s) {
    this.a = s.a;
    this.b = s.b;
    this.c = s.c;
    this.d = s.d;
  }
};
function newMatchSeed() {
  return Math.floor(Math.random() * 4294967296) | 0;
}

// src/physics/Arena.ts
function tagOf(body) {
  return body.getUserData()?.tag;
}
function playerOf(body) {
  return body.getUserData()?.player;
}
var STATIC_FRICTION = 0.5;
var STATIC_RESTITUTION = 0;
var Arena = class _Arena {
  /**
   * `rng` is the match's dice, which the kick-off ball's sideways speed is
   * rolled from. A caller that does not care (a check that builds a bare arena)
   * gets a fresh one; a match passes its own so both machines roll the same.
   *
   * `layout` picks the map: `'1v1'` is the original's arena, `'2v2'` the
   * project's own two-level one (`TWO_V_TWO`: tall goals, platforms, lifts).
   */
  constructor(rng = new Rng(newMatchSeed()), layout = "1v1") {
    this.rng = rng;
    this.layout = layout;
    this.world = new World(GRAVITY_X, GRAVITY_Y, true);
    this.ballRadius = ballRadius(1);
    this.buildStaticGeometry();
  }
  world;
  ball;
  /** Current ball radius, so renderers can scale the sprite. */
  ballRadius;
  /** See `BallSpec`: the density the current ball was built with. */
  ballDensity = BALL.density;
  /**
   * Current `PUBouncy`, in {0, 1, 2}. It sets the ball's restitution, and it
   * also picks the ball's artwork: `updateBall` ends with
   * `ball.GetUserData().inside.gotoAndStop(3 / 1 / 2)` for a dead / normal /
   * bouncy ball. Kept here beside the radius so the renderer and the online
   * snapshot read the ball's look from the same place its physics comes from.
   */
  ballBouncy = 1;
  leftPost;
  rightPost;
  leftGoalSize = "normal";
  rightGoalSize = "normal";
  streaker = null;
  /**
   * Contacts that began during the last `step()`, across all three sub-steps.
   * `velocity` is the relative velocity of the contact POINT, which is what
   * `CollisionHappened` compares against its 200 px/s sound threshold.
   */
  contactEvents = [];
  /** The crossbar's centre height for a goal size (fixed on the 2v2 map). */
  postY(size) {
    return this.layout === "2v2" ? TWO_V_TWO.goal.postY : GOAL_SIZES[size].postY;
  }
  buildStaticGeometry() {
    const twoVTwo = this.layout === "2v2";
    for (const box of twoVTwo ? TWO_V_TWO.walls : STATIC_BOXES) {
      this.createStaticBox(box, "wall", 0);
    }
    this.leftPost = this.createStaticBox(
      {
        x: GOAL_POST.leftX,
        y: this.postY("normal"),
        w: GOAL_POST.w,
        h: GOAL_POST.h
      },
      "goalpost",
      0
    );
    this.rightPost = this.createStaticBox(
      {
        x: GOAL_POST.rightX,
        y: this.postY("normal"),
        w: GOAL_POST.w,
        h: GOAL_POST.h
      },
      "goalpost",
      0
    );
    this.createStaticBox(GROUND_BOX, "ground", -1);
    if (twoVTwo) this.buildPlatforms();
  }
  /**
   * The 2v2 map's mid-level platforms: plain static boxes, solid both ways.
   * Group -1 like the ground, so legs sweep through them.
   */
  buildPlatforms() {
    const top = TWO_V_TWO.platformTop;
    const h = TWO_V_TWO.platformThickness;
    for (const part of TWO_V_TWO.platforms) {
      this.createStaticBox(
        { x: (part.minX + part.maxX) / 2, y: top + h / 2, w: part.maxX - part.minX, h },
        "platform",
        -1
      );
    }
  }
  /**
   * The 2v2 goal lift: every head whose centre is inside a goal's column,
   * between the crossbar and the ground, is carried upwards at a fixed speed.
   * It runs after the players' own movement each tick, so it overrides their
   * gravity nudge; the crossbar is what stops them, and stepping out of the
   * column is how they get off. Heads only — a ball in there has scored.
   */
  applyLift(heads) {
    if (this.layout !== "2v2") return;
    const lift = TWO_V_TWO.lift;
    for (const head of heads) {
      const p = head.getPosition();
      if (p.y < lift.topY || p.y > lift.bottomY) continue;
      const inLeft = p.x >= lift.left.minX && p.x <= lift.left.maxX;
      const inRight = p.x >= lift.right.minX && p.x <= lift.right.maxX;
      if (!inLeft && !inRight) continue;
      const v = head.getLinearVelocity();
      head.setLinearVelocity(v.x, lift.speed);
    }
  }
  /**
   * Spawns the selected pitch's obstacles (Blueprints_94.spawnProps).
   *
   * Blocks and circles are static (density 0); the polygon props are dynamic
   * with density 1, friction 0 and restitution 1, so they get knocked around
   * and are very bouncy. Those densities come straight from Blueprints_94.as.
   */
  buildPitchProps(pitchIndex) {
    for (const prop of getPitch(pitchIndex).props) {
      this.createProp(prop);
    }
  }
  createProp(prop) {
    const angle = prop.rotation * Math.PI / 180;
    const body = this.world.createBody({ x: prop.x, y: prop.y, angle });
    const size = prop.size ?? 0;
    switch (prop.kind) {
      case "block":
        body.createShape(
          PolygonShape.box((prop.w ?? 0) / 2, (prop.h ?? 0) / 2, {
            density: 0,
            friction: 0.5,
            restitution: 0,
            groupIndex: 0
          })
        );
        break;
      case "circle":
        body.createShape(
          new CircleShape({
            radius: prop.radius ?? 0,
            density: 0,
            friction: 0.5,
            restitution: 0,
            groupIndex: 0
          })
        );
        break;
      default:
        body.createShape(
          new PolygonShape({
            vertices: _Arena.propVertices(prop.kind, size),
            density: 1,
            friction: 0,
            restitution: 1,
            groupIndex: 0
          })
        );
        break;
    }
    body.setMassFromShapes();
    body.setUserData({ tag: "prop" });
    return body;
  }
  /** Vertex sets copied from B2DManager's spawn*Body helpers. */
  static propVertices(kind, s) {
    switch (kind) {
      case "equilateral":
        return [
          new Vec2(0, -s),
          new Vec2(0.865 * s, 0.5 * s),
          new Vec2(-0.865 * s, 0.5 * s)
        ];
      case "rightTriangle":
        return [new Vec2(0, 0), new Vec2(0, -s), new Vec2(s, 0)];
      case "hexagon":
        return [
          new Vec2(s * 0.5, -s * 0.866),
          new Vec2(s, 0),
          new Vec2(s * 0.5, s * 0.866),
          new Vec2(-s * 0.5, s * 0.866),
          new Vec2(-s, 0),
          new Vec2(-s * 0.5, -s * 0.866)
        ];
      case "trapezoid":
        return [
          new Vec2(-s / 4, -s / 4),
          new Vec2(s / 4, -s / 4),
          new Vec2(s / 2, s / 4),
          new Vec2(-s / 2, s / 4)
        ];
      default:
        return [];
    }
  }
  createStaticBox(box, tag, groupIndex) {
    const body = this.world.createBody({
      x: box.x,
      y: box.y,
      angle: (box.angle ?? 0) * Math.PI / 180
    });
    body.createShape(
      PolygonShape.box(box.w / 2, box.h / 2, {
        density: 0,
        friction: STATIC_FRICTION,
        restitution: STATIC_RESTITUTION,
        groupIndex
      })
    );
    body.setMassFromShapes();
    body.setUserData({ tag });
    return body;
  }
  // -------------------------------------------------------------------------
  // Clearance
  //
  // Nothing in the original needed this: it dropped power-ups at a random point
  // in a fixed box and never asked what was already there, which is why they
  // turn up buried inside an obstacle on the busier layouts. Answering "how far
  // is this point from the nearest solid thing" lets the spawner re-roll.
  // -------------------------------------------------------------------------
  /** Bodies a dropped pick-up must not end up inside. */
  static SOLID_TAGS = /* @__PURE__ */ new Set([
    "prop",
    "wall",
    "goalpost",
    "ground",
    "platform"
  ]);
  /**
   * Distance from (x, y) to the nearest solid surface, or a negative number if
   * the point is inside one.
   *
   * For polygons this is the largest signed distance to a face plane, which is
   * exact outside the faces and an under-estimate near a corner — conservative
   * in the direction that matters, since it can only make the spawner re-roll
   * a point it might have kept.
   */
  clearanceAt(x, y) {
    let nearest = Number.MAX_VALUE;
    for (const body of this.world.bodies) {
      const tag = tagOf(body);
      if (tag === void 0 || !_Arena.SOLID_TAGS.has(tag)) continue;
      for (const shape of body.shapes) {
        const d = _Arena.shapeDistance(shape, body.xf, x, y);
        if (d < nearest) nearest = d;
        if (nearest < 0) return nearest;
      }
    }
    return nearest;
  }
  static shapeDistance(shape, xf, x, y) {
    const R = xf.R;
    if (shape instanceof CircleShape) {
      const p = shape.localPosition;
      const cx = xf.position.x + (R.col1.x * p.x + R.col2.x * p.y);
      const cy = xf.position.y + (R.col1.y * p.x + R.col2.y * p.y);
      return dist(x - cx, y - cy) - shape.radius;
    }
    if (!(shape instanceof PolygonShape)) return Number.MAX_VALUE;
    const dx = x - xf.position.x;
    const dy = y - xf.position.y;
    const lx = R.col1.x * dx + R.col1.y * dy;
    const ly = R.col2.x * dx + R.col2.y * dy;
    let best = -Number.MAX_VALUE;
    for (let i = 0; i < shape.vertexCount; i++) {
      const n = shape.normals[i];
      const v = shape.vertices[i];
      const d = n.x * (lx - v.x) + n.y * (ly - v.y);
      if (d > best) best = d;
    }
    return best;
  }
  // -------------------------------------------------------------------------
  // Goals
  // -------------------------------------------------------------------------
  /** Moves a goal's crossbar, as PUHandler's goal-size calls do. */
  setGoalSize(side, size) {
    const postY = this.postY(size);
    if (side === "left") {
      this.leftGoalSize = size;
      this.leftPost.setXForm(GOAL_POST.leftX, postY, 0);
    } else {
      this.rightGoalSize = size;
      this.rightPost.setXForm(GOAL_POST.rightX, postY, 0);
    }
  }
  resetGoalSizes() {
    this.setGoalSize("left", "normal");
    this.setGoalSize("right", "normal");
  }
  /**
   * Rolls a ball off a goal roof, as `onFrame` does every tick. The zones and
   * the else-if live in `game/goal.ts` so they can be tested.
   */
  nudgeBallOffGoalRoof() {
    if (!this.ball) return;
    const p = this.ball.getPosition();
    const dx = goalRoofNudge(
      { x: p.x, y: p.y, radius: this.ballRadius },
      this.leftGoalSize,
      this.rightGoalSize,
      this.layout
    );
    if (dx === 0) return;
    const v = this.ball.getLinearVelocity();
    this.ball.setLinearVelocity(v.x + dx, v.y);
  }
  // -------------------------------------------------------------------------
  // Ball
  // -------------------------------------------------------------------------
  /**
   * Creates the kick-off ball (initLevel: radius 10, density 1.5), served
   * towards `serveTo` — the end that just conceded — or straight down for
   * the first ball of a match (`BALL.spawnVelX`).
   */
  spawnBall(serveTo = null) {
    this.ballRadius = ballRadius(1);
    this.ballBouncy = 1;
    this.ballDensity = BALL.density;
    this.ball = this.createBall(
      BALL.spawnX,
      BALL.spawnY,
      this.ballRadius,
      BALL.density,
      ballRestitution(1)
    );
    this.ball.setLinearVelocity(BALL.spawnVelX(this.rng.next(), serveTo), BALL.spawnVelY);
    return this.ball;
  }
  /**
   * Replaces the ball at its current position/velocity with one sized and
   * bounced per the power-up levels — MainTimeline.updateBall.
   *
   * Note the original uses density 0.6 here but 1.5 for the kick-off ball; that
   * inconsistency is preserved.
   */
  updateBall(puSize, puBouncy) {
    const pos = this.ball.getPosition();
    const vel = this.ball.getLinearVelocity();
    const angular = this.ball.getAngularVelocity();
    this.world.destroyBody(this.ball);
    this.ballRadius = ballRadius(puSize);
    this.ballBouncy = puBouncy;
    this.ballDensity = BALL.powerUpDensity;
    this.ball = this.createBall(
      pos.x,
      pos.y,
      this.ballRadius,
      BALL.powerUpDensity,
      ballRestitution(puBouncy)
    );
    this.ball.setLinearVelocity(vel.x, vel.y);
    this.ball.setAngularVelocity(angular);
  }
  createBall(x, y, radius, density, restitution) {
    const body = this.world.createBody({ x, y });
    body.createShape(
      new CircleShape({
        radius,
        density,
        friction: BALL.friction,
        restitution,
        groupIndex: BALL.group
      })
    );
    body.setMassFromShapes();
    body.setUserData({ tag: "ball" });
    return body;
  }
  destroyBall() {
    if (this.ball) {
      this.world.destroyBody(this.ball);
      this.ball = void 0;
    }
  }
  // -------------------------------------------------------------------------
  // Rewinding
  // -------------------------------------------------------------------------
  captureState() {
    return {
      ball: {
        radius: this.ballRadius,
        bouncy: this.ballBouncy,
        density: this.ballDensity
      },
      leftGoalSize: this.leftGoalSize,
      rightGoalSize: this.rightGoalSize,
      hasStreaker: this.streaker !== null
    };
  }
  /**
   * Puts the arena back to the *kind* of world `state` was captured in: the
   * right ball, the right streaker, the right goal sizes.
   *
   * A power-up replaces the ball body outright (`updateBall`) and the streaker
   * comes and goes, so rewinding across one means building the body again, not
   * just moving the one that is there. Where each body is and how fast it is
   * moving belongs to the world's own restore, which runs after this.
   */
  restoreShape(state) {
    const want = state.ball;
    if (!this.ball || this.ballRadius !== want.radius || this.ballBouncy !== want.bouncy || this.ballDensity !== want.density) {
      const at = this.ball ? this.ball.getPosition() : new Vec2(BALL.spawnX, BALL.spawnY);
      if (this.ball) this.world.destroyBody(this.ball);
      this.ballRadius = want.radius;
      this.ballBouncy = want.bouncy;
      this.ballDensity = want.density;
      this.ball = this.createBall(
        at.x,
        at.y,
        want.radius,
        want.density,
        ballRestitution(want.bouncy)
      );
    }
    if (state.hasStreaker) this.spawnStreaker();
    else this.removeStreaker();
    this.leftGoalSize = state.leftGoalSize;
    this.rightGoalSize = state.rightGoalSize;
  }
  // -------------------------------------------------------------------------
  // Streaker
  // -------------------------------------------------------------------------
  spawnStreaker() {
    if (this.streaker) return;
    const body = this.world.createBody({
      x: STREAKER.spawnX,
      y: STREAKER.spawnY,
      fixedRotation: true
    });
    body.createShape(
      new CircleShape({
        radius: STREAKER.radius,
        density: STREAKER.density,
        friction: STREAKER.friction,
        restitution: STREAKER.restitution,
        groupIndex: 0
      })
    );
    body.setMassFromShapes();
    body.setUserData({ tag: "streaker" });
    this.streaker = body;
  }
  removeStreaker() {
    if (!this.streaker) return;
    this.world.destroyBody(this.streaker);
    this.streaker = null;
  }
  // -------------------------------------------------------------------------
  // Stepping
  // -------------------------------------------------------------------------
  /**
   * One logic tick: three solver steps of 1/96 s, exactly as the original.
   * Callers apply input before this, never between the sub-steps.
   */
  step() {
    this.contactEvents.length = 0;
    for (let i = 0; i < STEPS_PER_TICK; i++) {
      this.world.step(TIME_STEP, SOLVER_ITERATIONS, SOLVER_ITERATIONS);
      for (const event of this.world.beganContacts) this.contactEvents.push(event);
    }
  }
};

// src/entities/Player.ts
var NO_INPUT = {
  left: false,
  right: false,
  jump: false,
  kick: false
};
var Player = class _Player {
  id;
  side;
  /** +1 for the right-side player, -1 for the left one. */
  mirror;
  world;
  head;
  leg;
  joint;
  /** Current size power-up state; drives the head/leg body dimensions. */
  size = "normal";
  // --- power-up state, mirroring MainTimeline's hero*/opp* variables ---
  /** PUSpeed in {0,1,2}; 1 is normal. */
  puSpeed = 1;
  /** PUJump in {0,1,2}; 1 is normal. */
  puJump = 1;
  /** Frozen by an ice power-up: cannot run. */
  frozen = false;
  /** Caught in a blast: cannot run, jump or kick. */
  bombed = false;
  /** Leg broken: the kick motor is disabled, the idle motor still runs. */
  legBroken = false;
  /**
   * Horizontal speed accumulator, persisted across ticks and decayed by
   * MOVE.damping — this is what gives the run its ramp-up and slide.
   */
  xspeed = 0;
  /** Set for one tick when the player jumps, so the scene can play a sound. */
  jumpedThisTick = false;
  platforms;
  maxX;
  constructor(world, id, side, spawnX, spawnY = HEAD.restY, options = {}) {
    this.world = world;
    this.id = id;
    this.side = side;
    this.mirror = side === "right" ? 1 : -1;
    this.platforms = options.platforms;
    this.maxX = options.maxX ?? MOVE.maxX;
    this.build(spawnX, spawnY);
  }
  // -------------------------------------------------------------------------
  // Body construction
  // -------------------------------------------------------------------------
  /** Scale factor for the current size power-up. */
  get scale() {
    return PLAYER_SIZE_SCALE[this.size];
  }
  get headRadius() {
    return HEAD.radius * this.scale;
  }
  build(x, y) {
    const s = this.scale;
    this.head = this.world.createBody({ x, y, fixedRotation: true });
    this.head.createShape(
      new CircleShape({
        radius: HEAD.radius * s,
        density: HEAD.density,
        friction: HEAD.friction,
        restitution: HEAD.restitution,
        groupIndex: HEAD.group
      })
    );
    this.head.setMassFromShapes();
    this.head.setUserData({
      tag: "head",
      player: this.id
    });
    this.leg = this.world.createBody({ x: x - this.mirror * LEG.width * s * 0.5, y });
    this.leg.createShape(
      PolygonShape.box(LEG.width * s / 2, LEG.height * s / 2, {
        density: LEG.density,
        friction: LEG.friction,
        restitution: LEG.restitution,
        groupIndex: LEG.group
      })
    );
    this.leg.setMassFromShapes();
    this.leg.setXForm(
      x + this.mirror * LEG.offsetX * s,
      y + LEG.offsetY * s,
      this.legSpawnAngle
    );
    this.leg.setUserData({
      tag: "leg",
      player: this.id
    });
    const anchor = this.head.getWorldCenter();
    this.joint = this.world.createJoint(
      new RevoluteJoint(
        this.head,
        this.leg,
        anchor.x,
        anchor.y,
        LEG.maxMotorTorque
      )
    );
  }
  /** Original: right player spawns at PI + 1.37, left at PI - 1.37. */
  get legSpawnAngle() {
    return Math.PI + this.mirror * LEG.spawnAngleFromPi;
  }
  /**
   * Rebuilds the head and leg at a new size, keeping position and velocity —
   * this is what makeHeroBig / makeHeroSmall / makeHeroNormal do.
   */
  setSize(size) {
    if (size === this.size) return;
    const pos = this.head.getPosition();
    const vel = this.head.getLinearVelocity();
    const x = pos.x;
    const y = pos.y;
    this.world.destroyBody(this.leg);
    this.world.destroyBody(this.head);
    this.size = size;
    this.build(x, y);
    this.head.setLinearVelocity(vel.x, vel.y);
  }
  // -------------------------------------------------------------------------
  // Rewinding
  // -------------------------------------------------------------------------
  /**
   * The player's own values. The head and leg live in the world and are
   * captured with it; `xspeed` is the one that would be easy to miss, because
   * it is private and never leaves this class — but it is the run's ramp-up and
   * slide, so a player restored without it stops dead or lurches.
   */
  captureState() {
    return {
      size: this.size,
      puSpeed: this.puSpeed,
      puJump: this.puJump,
      frozen: this.frozen,
      bombed: this.bombed,
      legBroken: this.legBroken,
      xspeed: this.xspeed,
      jumpedThisTick: this.jumpedThisTick
    };
  }
  /**
   * Rebuilds the head, leg and joint if they are not the size `state` was
   * captured at; a same-size player keeps its bodies. Their position and
   * velocity are the world's to restore afterwards.
   */
  restoreShape(state) {
    if (state.size === this.size) return;
    const pos = this.head.getPosition();
    this.world.destroyBody(this.leg);
    this.world.destroyBody(this.head);
    this.size = state.size;
    this.build(pos.x, pos.y);
  }
  restoreState(state) {
    this.size = state.size;
    this.puSpeed = state.puSpeed;
    this.puJump = state.puJump;
    this.frozen = state.frozen;
    this.bombed = state.bombed;
    this.legBroken = state.legBroken;
    this.xspeed = state.xspeed;
    this.jumpedThisTick = state.jumpedThisTick;
  }
  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------
  get x() {
    return this.head.getPosition().x;
  }
  get y() {
    return this.head.getPosition().y;
  }
  /** Joint targets for this side, taken verbatim from the original. */
  get targets() {
    return LEG_TARGETS[this.side];
  }
  /**
   * The original's ground test: `y + headArtHeight/2 > 459`, using the face
   * artwork's height (which scales with the size power-up).
   */
  isGrounded() {
    if (this.y + HEAD.artHeight * this.scale / 2 > 459) return true;
    return this.onPlatform();
  }
  /**
   * 2v2: the same test against a platform top — the face's lower edge within
   * the original's 1 px of it — for a head whose centre is over the platform
   * and which is standing on it rather than pressed up against its underside
   * (collider bottom no more than 1 px into the top).
   */
  onPlatform() {
    const platforms = this.platforms;
    if (!platforms) return false;
    const { x, y } = this;
    const top = platforms.top;
    if (y + HEAD.artHeight * this.scale / 2 <= top - 1) return false;
    if (y + this.headRadius > top + 1) return false;
    for (const part of platforms.parts) {
      if (x >= part.minX && x <= part.maxX) return true;
    }
    return false;
  }
  /**
   * Jump off the other player's head: close horizontally, above them, already
   * falling. The original granted this to the right-side player only.
   */
  canHeadBounce(other) {
    if (!SYMMETRIC_HEAD_BOUNCE && this.side !== "right") return false;
    return Math.abs(this.x - other.x) < HEAD_BOUNCE.maxDx && this.y < other.y && this.y > other.y - HEAD_BOUNCE.maxDy && this.head.getLinearVelocity().y >= HEAD_BOUNCE.minFallSpeed;
  }
  canBounceOffAny(others) {
    if (others instanceof _Player) return this.canHeadBounce(others);
    for (const other of others) {
      if (this.canHeadBounce(other)) return true;
    }
    return false;
  }
  // -------------------------------------------------------------------------
  // Per-tick update
  // -------------------------------------------------------------------------
  /**
   * Apply one tick of input. Must run before Arena.step(), never between the
   * solver sub-steps.
   *
   * `others` is everyone this player might bounce off: the opponent in 1v1,
   * the three other players in 2v2.
   */
  update(input, others) {
    this.jumpedThisTick = false;
    const accel = runAccel(this.puSpeed);
    const canRun = !this.frozen && !this.bombed;
    if (input.left && canRun) {
      this.xspeed -= accel;
    }
    if (input.right && canRun && this.x < this.maxX) {
      this.xspeed += accel;
    }
    if (input.jump && !this.bombed && (this.isGrounded() || this.canBounceOffAny(others))) {
      const v2 = this.head.getLinearVelocity();
      this.head.setLinearVelocity(v2.x, jumpVelocity(this.puJump));
      this.jumpedThisTick = true;
    }
    this.updateLegMotor(input.kick);
    this.xspeed *= MOVE.damping;
    const v = this.head.getLinearVelocity();
    this.head.setLinearVelocity(this.xspeed, v.y + MOVE.extraFallPerTick);
  }
  /**
   * The leg motor is a P-controller onto the idle or kick pose. A bombed player
   * gets no motor at all (the leg goes limp); a broken leg can still return to
   * idle but cannot swing.
   */
  updateLegMotor(kicking) {
    if (this.bombed) return;
    const { idle, kick } = this.targets;
    const target = kicking && !this.legBroken ? kick : idle;
    const gain = kicking && !this.legBroken ? LEG_KICK_GAIN : LEG_IDLE_GAIN;
    this.joint.setMotorSpeed(-gain * (this.joint.getJointAngle() - target));
  }
  // -------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------
  /** Returns the player to their kick-off pose and clears power-up state. */
  resetTo(x, y = HEAD.restY) {
    this.xspeed = 0;
    this.puSpeed = 1;
    this.puJump = 1;
    this.frozen = false;
    this.bombed = false;
    this.legBroken = false;
    if (this.size !== "normal") this.setSize("normal");
    const s = this.scale;
    this.head.setLinearVelocity(0, 0);
    this.head.setXForm(x, y, 0);
    this.leg.setLinearVelocity(0, 0);
    this.leg.setAngularVelocity(0);
    this.leg.setXForm(
      x + this.mirror * LEG.offsetX * s,
      y + LEG.offsetY * s,
      this.legSpawnAngle
    );
    this.joint.setMotorSpeed(0);
  }
  /** Removes both bodies from the world (the joint goes with them). */
  destroy() {
    this.world.destroyBody(this.leg);
    this.world.destroyBody(this.head);
  }
};

// src/game/match.ts
var SIMPLE_PITCH = 1;
var matchPitch = (config) => config.simpleMap ? SIMPLE_PITCH : config.pitch;
var powerUpsOn = (config) => config.powerUps !== false;
var isTwoVTwo = (config) => config.format === "2v2";
var DEFAULT_MATCH = {
  mode: "first-to",
  target: 7,
  duration: 60,
  p1Head: 1,
  p2Head: 2,
  pitch: 1,
  backdrop: 1,
  series: 1
};
var MatchState = class {
  config;
  p1Score = 0;
  p2Score = 0;
  phase = "countdown";
  /** Ticks remaining in the current non-playing phase. */
  phaseTicks = 0;
  /** Whole seconds left in 'timed'. */
  secondsLeft;
  /** Set once a timed match has run out level and gone to next-goal-wins. */
  suddenDeath = false;
  result = null;
  /** Who scored the most recent goal, for the banner. */
  lastScorer = null;
  matchSecondTicks = 0;
  constructor(config) {
    this.config = config;
    this.secondsLeft = config.duration;
  }
  captureState() {
    return {
      p1Score: this.p1Score,
      p2Score: this.p2Score,
      phase: this.phase,
      phaseTicks: this.phaseTicks,
      secondsLeft: this.secondsLeft,
      suddenDeath: this.suddenDeath,
      result: this.result ? { ...this.result } : null,
      lastScorer: this.lastScorer,
      matchSecondTicks: this.matchSecondTicks
    };
  }
  restoreState(s) {
    this.p1Score = s.p1Score;
    this.p2Score = s.p2Score;
    this.phase = s.phase;
    this.phaseTicks = s.phaseTicks;
    this.secondsLeft = s.secondsLeft;
    this.suddenDeath = s.suddenDeath;
    this.result = s.result ? { ...s.result } : null;
    this.lastScorer = s.lastScorer;
    this.matchSecondTicks = s.matchSecondTicks;
  }
  /** Effective goals-to-win, ignored in timed play until sudden death. */
  get target() {
    return this.config.mode === "golden-goal" ? 1 : this.config.target;
  }
  /** True when one more goal ends the match for whoever is leading. */
  isMatchPoint() {
    if (this.config.mode === "timed") return this.suddenDeath;
    const t = this.target;
    return this.p1Score === t - 1 || this.p2Score === t - 1;
  }
  /** Records a goal and returns true if it ended the match. */
  scoreGoal(scorer) {
    this.lastScorer = scorer;
    if (scorer === "p1") this.p1Score++;
    else this.p2Score++;
    if (this.config.mode === "timed") {
      if (this.suddenDeath) {
        this.finish(scorer);
        return true;
      }
      return false;
    }
    if ((scorer === "p1" ? this.p1Score : this.p2Score) >= this.target) {
      this.finish(scorer);
      return true;
    }
    return false;
  }
  /**
   * Advances the match clock. Call once per tick while playing.
   * Returns true if time just ran out.
   */
  tickClock(ticksPerSecond) {
    if (this.config.mode !== "timed" || this.suddenDeath) return false;
    this.matchSecondTicks++;
    if (this.matchSecondTicks < ticksPerSecond) return false;
    this.matchSecondTicks = 0;
    this.secondsLeft--;
    if (this.secondsLeft > 0) return false;
    this.secondsLeft = 0;
    if (this.p1Score === this.p2Score) {
      this.suddenDeath = true;
    } else {
      this.finish(this.p1Score > this.p2Score ? "p1" : "p2");
    }
    return true;
  }
  finish(winner) {
    this.phase = "over";
    this.result = { winner, p1: this.p1Score, p2: this.p2Score };
  }
  clockText() {
    const s = Math.max(0, this.secondsLeft);
    const m = Math.floor(s / 60);
    const rest = s % 60;
    return `${m}:${rest < 10 ? "0" : ""}${rest}`;
  }
};

// src/game/powerups.ts
var POWERUP_KINDS = [
  "speed-good",
  "speed-bad",
  "jump-good",
  "jump-bad",
  "ice-good",
  "ice-bad",
  "bombs-good",
  "bombs-bad",
  "fireground",
  "bigball",
  "bouncyball",
  "smallball",
  "deadball",
  "size-good",
  "size-bad",
  "break-good",
  "break-bad",
  "streaker"
];
var POWERUP_LABEL = {
  "speed-good": "Super Speed",
  "speed-bad": "Slow Speed",
  "jump-good": "Super Jump",
  "jump-bad": "Low Jump",
  "ice-good": "Freeze",
  "ice-bad": "Freeze",
  "bombs-good": "Big Goal",
  "bombs-bad": "Small Goal",
  fireground: "Bombs",
  bigball: "Big Ball",
  bouncyball: "Bouncy Ball",
  smallball: "Small Ball",
  deadball: "Dead Ball",
  "size-good": "Big Head",
  "size-bad": "Small Head",
  "break-good": "Broken Leg",
  "break-bad": "Broken Leg",
  streaker: "Streaker"
};
var POWERUP_KINDS_2V2 = POWERUP_KINDS.filter(
  (k) => k !== "bombs-good" && k !== "bombs-bad"
);
function randomPowerUpKind(rng, kinds = POWERUP_KINDS) {
  return kinds[Math.floor(rng.next() * kinds.length)];
}
function dropAge(d) {
  return POWERUP.lifetimeTicks - d.ticksLeft;
}
function isArmed(d) {
  return dropAge(d) >= POWERUP.armTicks;
}

// src/game/PowerUpSystem.ts
function emptyEvents() {
  return {
    captions: [],
    rings: [],
    explosions: [],
    playedCoin: false,
    playedPop: false
  };
}
function breakLegTicks(side) {
  return side === "right" ? PU_DURATION.breakLegHero : PU_DURATION.breakLegOpp;
}
var Countdown = class {
  left = 0;
  start(ticks) {
    this.left = ticks;
  }
  cancel() {
    this.left = 0;
  }
  /** Ticks remaining, for capturing; `restore` is its inverse. */
  get remaining() {
    return this.left;
  }
  restore(ticks) {
    this.left = ticks;
  }
  get active() {
    return this.left > 0;
  }
  /** Decrements; returns true on the tick it reaches zero. */
  tick() {
    if (this.left <= 0) return false;
    this.left--;
    return this.left === 0;
  }
};
var KICKOFF_TOUCH = { p1: "p1", p2: "p2" };
var SLOTS_1V1 = ["p1", "p2"];
var SLOTS_2V2 = ["p1", "p2", "p1b", "p2b"];
function perPlayer() {
  return { p1: new Countdown(), p2: new Countdown(), p1b: new Countdown(), p2b: new Countdown() };
}
var PowerUpSystem = class {
  /**
   * `rng` is the match's dice: every drop position, every power-up kind, every
   * bomb and the streaker's wandering come from it, never `Math.random()`, so
   * that two machines sharing a seed roll the same numbers in the same order.
   */
  constructor(arena, p1, p2, rng = new Rng(newMatchSeed()), upper = null) {
    this.arena = arena;
    this.p1 = p1;
    this.p2 = p2;
    this.rng = rng;
    this.upper = upper;
  }
  dropped = [];
  bombs = [];
  /** Ball state, shared by both players. PUSize/PUBouncy default to 1. */
  puSize = 1;
  puBouncy = 1;
  spawnTimer = 0;
  /**
   * False when the match has power-ups switched off (`MatchConfig.powerUps`):
   * nothing is ever dropped. Fixed for the whole match, so it is not saved.
   */
  spawning = true;
  // Per-player effect timers. The upper seats' only ever run in 2v2.
  speed = perPlayer();
  jump = perPlayer();
  ice = perPlayer();
  legBreak = perPlayer();
  playerSize = perPlayer();
  goal = { left: new Countdown(), right: new Countdown() };
  // Shared timers.
  ballSize = new Countdown();
  ballBouncy = new Countdown();
  streakerTimer = new Countdown();
  fire = new Countdown();
  /** Ticks since the fireground power-up landed, for the bomb drop schedule. */
  fireElapsed = -1;
  streakerTargetX = STREAKER.spawnX;
  /**
   * Every countdown, in the one fixed order `captureState` and `restoreState`
   * share. The 1v1 sixteen come first and in their old order, so a 1v1 save
   * is exactly what it always was; 2v2 appends the upper players' ten.
   */
  timers() {
    const list = [
      this.speed.p1,
      this.speed.p2,
      this.jump.p1,
      this.jump.p2,
      this.ice.p1,
      this.ice.p2,
      this.legBreak.p1,
      this.legBreak.p2,
      this.playerSize.p1,
      this.playerSize.p2,
      this.goal.left,
      this.goal.right,
      this.ballSize,
      this.ballBouncy,
      this.streakerTimer,
      this.fire
    ];
    if (this.upper) {
      for (const id of ["p1b", "p2b"]) {
        list.push(this.speed[id], this.jump[id], this.ice[id], this.legBreak[id], this.playerSize[id]);
      }
    }
    return list;
  }
  /** The seats in play, in the order effects are applied and expire. */
  slots() {
    return this.upper ? SLOTS_2V2 : SLOTS_1V1;
  }
  /**
   * Who an effect aimed at "the opponent" of `id` lands on: the one opponent
   * in 1v1; in 2v2 whichever player of the other team touched the ball last
   * (user, 2026-10-16 — it used to be both of them).
   */
  foe(id, lastTouch) {
    if (this.upper) return lastTouch[teamOf(id) === "p1" ? "p2" : "p1"];
    return id === "p1" ? "p2" : "p1";
  }
  captureState() {
    return {
      dropped: this.dropped.map((d) => ({ ...d })),
      bombs: this.bombs.map((b) => ({ ...b })),
      puSize: this.puSize,
      puBouncy: this.puBouncy,
      spawnTimer: this.spawnTimer,
      timers: this.timers().map((t) => t.remaining),
      fireElapsed: this.fireElapsed,
      streakerTargetX: this.streakerTargetX
    };
  }
  restoreState(s) {
    this.dropped.length = 0;
    for (const d of s.dropped) this.dropped.push({ ...d });
    this.bombs.length = 0;
    for (const b of s.bombs) this.bombs.push({ ...b });
    this.puSize = s.puSize;
    this.puBouncy = s.puBouncy;
    this.spawnTimer = s.spawnTimer;
    this.timers().forEach((t, i) => t.restore(s.timers[i]));
    this.fireElapsed = s.fireElapsed;
    this.streakerTargetX = s.streakerTargetX;
  }
  player(id) {
    switch (id) {
      case "p1":
        return this.p1;
      case "p2":
        return this.p2;
      default:
        if (!this.upper) throw new Error(`PowerUpSystem: no ${id} in a 1v1 match`);
        return this.upper[id];
    }
  }
  /** The goal a player defends — that is the one their goal-size effects move. */
  goalOf(id) {
    return this.player(id).side === "left" ? "left" : "right";
  }
  // -------------------------------------------------------------------------
  // Per-tick
  // -------------------------------------------------------------------------
  /**
   * Advances every timer and the dropped/bomb lists.
   * `ballSender` is whoever last touched the ball — the original's `ballSender`.
   * `lastTouch` is the last toucher on each team; only 2v2 reads it.
   */
  tick(ballSender, lastTouch = KICKOFF_TOUCH) {
    const ev = emptyEvents();
    this.tickSpawn(ev);
    this.tickPickups(ballSender, lastTouch, ev);
    this.tickExpiries();
    this.tickBombs(ev);
    this.tickStreaker();
    return ev;
  }
  tickSpawn(ev) {
    if (!this.spawning) return;
    this.spawnTimer++;
    if (this.spawnTimer <= POWERUP.spawnEveryTicks) return;
    this.spawnTimer = 0;
    const spot = this.findSpawnSpot();
    const drop = {
      kind: randomPowerUpKind(this.rng, this.upper ? POWERUP_KINDS_2V2 : POWERUP_KINDS),
      x: spot.x,
      y: spot.y,
      ticksLeft: POWERUP.lifetimeTicks
    };
    this.dropped.push(drop);
    ev.rings.push({ x: drop.x, y: drop.y });
    ev.playedPop = true;
  }
  /**
   * A point in the original's drop box that is not inside an obstacle and not
   * on top of the ball.
   *
   * `spawnPU` rolled one random point and used it, so on the busier layouts
   * power-ups appeared embedded in a block — half the icon hidden, and the ball
   * unable to get its centre within `pickupDistance` of a spot buried behind a
   * wall. It also landed them under a ball that was sitting still, to be
   * collected the moment they armed. The box and the distribution are
   * unchanged; this only rejects crowded points, and if every candidate is
   * crowded keeps the one with the most room *relative to what it wanted* on
   * both counts, so a drop is never skipped.
   */
  findSpawnSpot() {
    const ball = this.arena.ball?.getPosition() ?? null;
    let best = { x: 0, y: 0 };
    let bestRoom = -Number.MAX_VALUE;
    for (let i = 0; i < POWERUP.spawnAttempts; i++) {
      const x = POWERUP.spawnMinX + this.rng.next() * POWERUP.spawnRangeX;
      const y = POWERUP.spawnMinY + this.rng.next() * POWERUP.spawnRangeY;
      const clearance = this.arena.clearanceAt(x, y) / POWERUP.clearance;
      const fromBall = ball ? dist(x - ball.x, y - ball.y) / POWERUP.ballClearance : Number.MAX_VALUE;
      const room = Math.min(clearance, fromBall);
      if (room >= 1) return { x, y };
      if (room > bestRoom) {
        bestRoom = room;
        best = { x, y };
      }
    }
    return best;
  }
  tickPickups(ballSender, lastTouch, ev) {
    if (!this.arena.ball) return;
    const ball = this.arena.ball.getPosition();
    for (let i = this.dropped.length - 1; i >= 0; i--) {
      const pu = this.dropped[i];
      pu.ticksLeft--;
      const collected = isArmed(pu) && dist(pu.x - ball.x, pu.y - ball.y) < POWERUP.pickupDistance;
      if (collected) {
        this.apply(pu.kind, ballSender, ev, lastTouch);
        ev.captions.push(POWERUP_LABEL[pu.kind]);
        ev.playedCoin = true;
        this.dropped.splice(i, 1);
      } else if (pu.ticksLeft < 0) {
        this.dropped.splice(i, 1);
      }
    }
  }
  tickExpiries() {
    for (const id of this.slots()) {
      if (this.speed[id].tick()) this.player(id).puSpeed = 1;
      if (this.jump[id].tick()) this.player(id).puJump = 1;
      if (this.ice[id].tick()) this.player(id).frozen = false;
      if (this.legBreak[id].tick()) this.player(id).legBroken = false;
      if (this.playerSize[id].tick()) this.player(id).setSize("normal");
    }
    for (const side of ["left", "right"]) {
      if (this.goal[side].tick()) this.arena.setGoalSize(side, "normal");
    }
    if (this.ballSize.tick()) {
      this.puSize = 1;
      this.arena.updateBall(this.puSize, this.puBouncy);
    }
    if (this.ballBouncy.tick()) {
      this.puBouncy = 1;
      this.arena.updateBall(this.puSize, this.puBouncy);
    }
    if (this.streakerTimer.tick()) this.arena.removeStreaker();
  }
  // -------------------------------------------------------------------------
  // Bombs (Bomb.as — hand-integrated, not physics bodies)
  // -------------------------------------------------------------------------
  tickBombs(ev) {
    if (this.fire.tick()) {
      for (const id of this.slots()) this.player(id).bombed = false;
      this.fireElapsed = -1;
    }
    if (this.fireElapsed >= 0) {
      this.fireElapsed++;
      if (BOMB_DROP_TICKS.includes(this.fireElapsed)) {
        this.bombs.push({
          x: BOMB.spawnMinX + this.rng.next() * BOMB.spawnRangeX,
          y: BOMB.spawnY,
          ySpeed: 0
        });
      }
    }
    for (let i = this.bombs.length - 1; i >= 0; i--) {
      const bomb = this.bombs[i];
      bomb.ySpeed += BOMB.gravityPerTick;
      bomb.y += bomb.ySpeed;
      if (bomb.y < BOMB.groundY) continue;
      bomb.y = BOMB.groundY;
      for (const id of this.slots()) {
        const p = this.player(id);
        if (dist(bomb.x - p.x, bomb.y - p.y) < BOMB.blastRadius) {
          p.bombed = true;
        }
      }
      ev.explosions.push({ x: bomb.x, y: bomb.y });
      this.bombs.splice(i, 1);
    }
  }
  // -------------------------------------------------------------------------
  // Streaker
  // -------------------------------------------------------------------------
  tickStreaker() {
    const s = this.arena.streaker;
    if (!s) return;
    const pos = s.getPosition();
    const vel = s.getLinearVelocity();
    if (Math.abs(pos.x - this.streakerTargetX) < STREAKER.retargetDistance) {
      this.streakerTargetX = STREAKER.targetMinX + this.rng.next() * STREAKER.targetRangeX;
    }
    const dir = pos.x < this.streakerTargetX ? 1 : -1;
    s.setLinearVelocity(STREAKER.walkSpeed * dir, vel.y);
    if (pos.y > 439) {
      const v = s.getLinearVelocity();
      s.setLinearVelocity(v.x, STREAKER.hopVelocity);
    }
  }
  // -------------------------------------------------------------------------
  // Effects
  // -------------------------------------------------------------------------
  /**
   * `sender` is whoever last touched the ball. In the original a "Good"
   * power-up helps the sender and a "Bad" one hurts them; the goal-size ones
   * resize the goal the sender is ATTACKING for Good and their own for Bad.
   */
  apply(kind, sender, ev, lastTouch = KICKOFF_TOUCH) {
    const me = this.player(sender);
    const foeId = this.foe(sender, lastTouch);
    switch (kind) {
      case "speed-good":
        me.puSpeed = 2;
        this.speed[sender].start(PU_DURATION.speed);
        break;
      case "speed-bad":
        me.puSpeed = 0;
        this.speed[sender].start(PU_DURATION.speed);
        break;
      case "jump-good":
        me.puJump = 2;
        this.jump[sender].start(PU_DURATION.jump);
        break;
      case "jump-bad":
        me.puJump = 0;
        this.jump[sender].start(PU_DURATION.jump);
        break;
      // "Good" ice freezes the opponent, "Bad" freezes the sender.
      case "ice-good":
        this.player(foeId).frozen = true;
        this.ice[foeId].start(PU_DURATION.ice);
        break;
      case "ice-bad":
        me.frozen = true;
        this.ice[sender].start(PU_DURATION.ice);
        break;
      // Goal-size: Good enlarges the goal you are shooting at, Bad shrinks it.
      case "bombs-good": {
        const target = this.goalOf(foeId);
        this.arena.setGoalSize(target, "big");
        this.goal[target].start(PU_DURATION.goalSize);
        break;
      }
      case "bombs-bad": {
        const target = this.goalOf(foeId);
        this.arena.setGoalSize(target, "small");
        this.goal[target].start(PU_DURATION.goalSize);
        break;
      }
      case "size-good":
        me.setSize("big");
        this.playerSize[sender].start(PU_DURATION.playerSize);
        break;
      case "size-bad":
        me.setSize("small");
        this.playerSize[sender].start(PU_DURATION.playerSize);
        break;
      // "Good" breaks the opponent's leg, "Bad" breaks the sender's.
      case "break-good": {
        const foe = this.player(foeId);
        foe.legBroken = true;
        this.legBreak[foeId].start(breakLegTicks(foe.side));
        break;
      }
      case "break-bad":
        me.legBroken = true;
        this.legBreak[sender].start(breakLegTicks(me.side));
        break;
      case "fireground":
        this.fire.start(PU_DURATION.fire);
        this.fireElapsed = 0;
        break;
      case "bigball":
        this.puSize = 2;
        this.arena.updateBall(this.puSize, this.puBouncy);
        this.ballSize.start(PU_DURATION.ballSize);
        ev.rings.push(this.ballPos());
        break;
      case "smallball":
        this.puSize = 0;
        this.arena.updateBall(this.puSize, this.puBouncy);
        this.ballSize.start(PU_DURATION.ballSize);
        ev.rings.push(this.ballPos());
        break;
      case "bouncyball":
        this.puBouncy = 2;
        this.arena.updateBall(this.puSize, this.puBouncy);
        this.ballBouncy.start(PU_DURATION.ballBouncy);
        ev.rings.push(this.ballPos());
        break;
      case "deadball":
        this.puBouncy = 0;
        this.arena.updateBall(this.puSize, this.puBouncy);
        this.ballBouncy.start(PU_DURATION.ballBouncy);
        ev.rings.push(this.ballPos());
        break;
      case "streaker":
        this.arena.spawnStreaker();
        this.streakerTimer.start(PU_DURATION.streaker);
        break;
    }
  }
  ballPos() {
    const p = this.arena.ball.getPosition();
    return { x: p.x, y: p.y };
  }
  /** Clears everything for a kick-off (MainTimeline.resetPUVars). */
  reset() {
    this.dropped.length = 0;
    this.bombs.length = 0;
    this.spawnTimer = 0;
    this.puSize = 1;
    this.puBouncy = 1;
    this.fireElapsed = -1;
    for (const id of this.slots()) {
      this.speed[id].cancel();
      this.jump[id].cancel();
      this.ice[id].cancel();
      this.legBreak[id].cancel();
      this.playerSize[id].cancel();
      const player = this.player(id);
      player.puSpeed = 1;
      player.puJump = 1;
      player.frozen = false;
      player.bombed = false;
      player.legBroken = false;
      if (player.size !== "normal") player.setSize("normal");
    }
    this.goal.left.cancel();
    this.goal.right.cancel();
    this.ballSize.cancel();
    this.ballBouncy.cancel();
    this.streakerTimer.cancel();
    this.fire.cancel();
    this.arena.resetGoalSizes();
    this.arena.removeStreaker();
  }
};

// src/game/MatchSim.ts
var MatchSim = class {
  constructor(config, seed) {
    this.config = config;
    this.seed = seed;
    this.twoVTwo = isTwoVTwo(config);
    this.state = new MatchState(config);
    this.rng = new Rng(seed);
    if (!this.twoVTwo) {
      this.arena = new Arena(this.rng);
      this.arena.buildPitchProps(matchPitch(config));
      this.p1 = new Player(this.arena.world, "p1", "left", SPAWN_LEFT_X);
      this.p2 = new Player(this.arena.world, "p2", "right", SPAWN_RIGHT_X);
      this.players = [this.p1, this.p2];
    } else {
      this.arena = new Arena(this.rng, "2v2");
      const options = {
        platforms: { parts: TWO_V_TWO.platforms, top: TWO_V_TWO.platformTop },
        maxX: TWO_V_TWO.maxRunX
      };
      const make = (slot) => {
        const at = TWO_V_TWO.spawns[slot];
        const side = slot === "p1" || slot === "p1b" ? "left" : "right";
        return new Player(this.arena.world, slot, side, at.x, at.y, options);
      };
      this.p1 = make("p1");
      this.p2 = make("p2");
      this.p1b = make("p1b");
      this.p2b = make("p2b");
      this.players = [this.p1, this.p2, this.p1b, this.p2b];
    }
    this.arena.spawnBall();
    this.powerUps = new PowerUpSystem(
      this.arena,
      this.p1,
      this.p2,
      this.rng,
      this.p1b && this.p2b ? { p1b: this.p1b, p2b: this.p2b } : null
    );
    this.powerUps.spawning = powerUpsOn(config);
    this.beginCountdown();
  }
  rng;
  arena;
  p1;
  p2;
  powerUps;
  state;
  /** 2v2: the upper player of each team. Null in a 1v1 match. */
  p1b = null;
  p2b = null;
  /** Every player, in the order they are stepped: p1, p2, then p1b, p2b. */
  players;
  /** Whether this is the 2v2 map (`config.format`). */
  twoVTwo;
  /**
   * Whoever last touched the ball — the original's `ballSender`. A seat, not
   * a team: on the 2v2 map an effect goes to the one player who touched it.
   */
  ballSender = "p1";
  /**
   * 2v2: the last player of each team to touch the ball — who an effect aimed
   * at "the opponent" lands on. 1v1 keeps it but never reads or saves it.
   */
  lastTouch = KICKOFF_TOUCH;
  /** The player in a seat, or null for an upper seat in a 1v1 match. */
  player(slot) {
    switch (slot) {
      case "p1":
        return this.p1;
      case "p2":
        return this.p2;
      case "p1b":
        return this.p1b;
      case "p2b":
        return this.p2b;
    }
  }
  // -------------------------------------------------------------------------
  // The tick
  // -------------------------------------------------------------------------
  /**
   * Advances the match by one 30 Hz tick.
   *
   * `inputs` is a function so it is only asked for on a tick that actually
   * steps the world: nothing is read during a countdown.
   */
  step(inputs, observer = {}) {
    const report = {
      phase: this.state.phase,
      worldStepped: false,
      sounds: [],
      goal: null,
      kickoff: false,
      playBegan: false,
      matchOver: false,
      suddenDeath: false,
      clockAdvanced: false
    };
    switch (this.state.phase) {
      case "countdown":
        this.tickCountdown(report);
        break;
      case "celebrating":
        this.tickCelebration(inputs, observer, report);
        break;
      case "playing":
        this.tickPlay(inputs, observer, report);
        break;
      default:
        break;
    }
    return report;
  }
  tickCountdown(report) {
    this.state.phaseTicks--;
    if (this.state.phaseTicks <= 0) {
      this.state.phase = "playing";
      report.playBegan = true;
    }
  }
  /**
   * The goal celebration keeps the world running.
   *
   * `pointComp` sets `inGoal`, **not** `pauseGame` — only `initLevel` sets that,
   * for the kick-off countdown — so the original simulates straight through
   * these frames. The ball carries on into the net and both players keep
   * moving; all `inGoal` does is show the banner and block a second goal.
   */
  tickCelebration(inputs, observer, report) {
    this.stepWorld(inputs, observer, report);
    this.advanceClock(report);
    if (this.state.phase !== "celebrating") return;
    this.state.phaseTicks--;
    if (this.state.phaseTicks > 0) return;
    if (this.state.result) {
      this.state.phase = "over";
      report.matchOver = true;
    } else {
      this.resetForKickOff(report);
    }
  }
  tickPlay(inputs, observer, report) {
    this.stepWorld(inputs, observer, report);
    const scorer = this.detectGoal();
    if (scorer) {
      this.state.scoreGoal(scorer);
      report.goal = scorer;
      this.state.phase = "celebrating";
      this.state.phaseTicks = GOAL_CELEBRATION_TICKS;
      return;
    }
    this.advanceClock(report);
  }
  /** One tick of the simulation: input, power-ups, then the solver steps. */
  stepWorld(inputs, observer, report) {
    const pressed = inputs();
    if (!this.twoVTwo) {
      this.p1.update(pressed.p1, this.p2);
      this.p2.update(pressed.p2, this.p1);
    } else {
      for (const player of this.players) {
        player.update(
          pressed[player.id] ?? NO_INPUT,
          this.players.filter((other) => other !== player)
        );
      }
      this.arena.applyLift(this.players.map((p) => p.head));
    }
    report.worldStepped = true;
    if (this.players.some((p) => p.jumpedThisTick)) {
      report.sounds.push("sfx-jump");
    }
    this.arena.nudgeBallOffGoalRoof();
    const events = this.powerUps.tick(this.ballSender, this.lastTouch);
    if (events.playedPop) report.sounds.push("sfx-pop");
    if (events.playedCoin) report.sounds.push("sfx-coin");
    for (let i = 0; i < events.explosions.length; i++) {
      report.sounds.push("sfx-explosion");
    }
    observer.beforeSolve?.(events);
    this.arena.step();
    this.drainContacts(report.sounds);
    observer.afterSolve?.(report.sounds);
  }
  /**
   * Who touched the ball last, and whether it was hard enough to hear.
   *
   * Contacts are collected inside `world.step()`, so this runs straight after
   * the tick's three sub-steps rather than from a listener.
   */
  drainContacts(sounds) {
    for (const event of this.arena.contactEvents) {
      const a = event.body1;
      const b = event.body2;
      const tagA = tagOf(a);
      const tagB = tagOf(b);
      if (tagA !== "ball" && tagB !== "ball") continue;
      const otherBody = tagA === "ball" ? b : a;
      const otherTag = tagA === "ball" ? tagB : tagA;
      if (otherTag === "head" || otherTag === "leg") {
        const owner = playerOf(otherBody);
        if (owner) {
          this.ballSender = owner;
          if (this.twoVTwo) this.lastTouch = { ...this.lastTouch, [teamOf(owner)]: owner };
        }
      }
      const speed = dist(event.velocity.x, event.velocity.y);
      if (speed > KICK_SOUND_MIN_SPEED) sounds.push("sfx-kick");
    }
  }
  /** The match clock, which runs whenever the world does. */
  advanceClock(report) {
    if (this.state.tickClock(TICKS_PER_MATCH_SECOND)) {
      if (this.state.result) report.matchOver = true;
      else if (this.state.suddenDeath) report.suddenDeath = true;
    }
    report.clockAdvanced = true;
  }
  /**
   * A goal is the ball's centre entering a goal mouth. P1 defends the left
   * goal, so a ball in the left mouth is P2's goal. The mouth's vertical extent
   * follows the current goal size.
   */
  detectGoal() {
    const p = this.arena.ball.getPosition();
    return detectGoal(
      { x: p.x, y: p.y, radius: this.arena.ballRadius },
      this.arena.leftGoalSize,
      this.arena.rightGoalSize,
      this.arena.layout
    );
  }
  // -------------------------------------------------------------------------
  // Phases
  // -------------------------------------------------------------------------
  beginCountdown() {
    this.state.phase = "countdown";
    this.state.phaseTicks = COUNTDOWN_TICKS;
  }
  resetForKickOff(report) {
    this.powerUps.reset();
    this.arena.destroyBall();
    const scorer = this.state.lastScorer;
    this.arena.spawnBall(scorer === null ? null : scorer === "p1" ? "right" : "left");
    if (!this.twoVTwo) {
      this.p1.resetTo(SPAWN_LEFT_X);
      this.p2.resetTo(SPAWN_RIGHT_X);
    } else {
      for (const player of this.players) {
        const at = TWO_V_TWO.spawns[player.id];
        player.resetTo(at.x, at.y);
      }
    }
    this.ballSender = "p1";
    this.lastTouch = KICKOFF_TOUCH;
    this.beginCountdown();
    report.kickoff = true;
  }
  // -------------------------------------------------------------------------
  // Rewinding
  // -------------------------------------------------------------------------
  /**
   * A name for every body in the world, in world order.
   *
   * Heads, legs, the ball and the streaker are replaced during a match (a size
   * power-up rebuilds a player, a ball one rebuilds the ball), so a body object
   * is not a stable identity across time. The fixed geometry — walls, posts,
   * ground, obstacles — never is, and keeps its relative order, so it is named
   * by count.
   */
  bodySlots() {
    let fixed = 0;
    return this.arena.world.bodies.map((b) => {
      const tag = tagOf(b);
      if (tag === "head" || tag === "leg") return `${playerOf(b)}.${tag}`;
      if (tag === "ball" || tag === "streaker") return tag;
      return `fixed.${fixed++}`;
    });
  }
  /**
   * The world lists its bodies in the order they were made, and the solver
   * walks them in that order — so after a power-up has rebuilt one and put it
   * at the end, the order is part of the state and has to come back with it.
   */
  orderBodies(slots) {
    const bodies = this.arena.world.bodies;
    const bySlot = /* @__PURE__ */ new Map();
    this.bodySlots().forEach((slot, i) => bySlot.set(slot, bodies[i]));
    if (slots.length !== bodies.length) {
      throw new Error(
        `MatchSim.restoreState: ${slots.length} bodies captured, ${bodies.length} present`
      );
    }
    const ordered = slots.map((slot) => {
      const body = bySlot.get(slot);
      if (!body) throw new Error(`MatchSim.restoreState: no body for "${slot}"`);
      return body;
    });
    bodies.length = 0;
    bodies.push(...ordered);
  }
  captureState() {
    return {
      world: this.arena.world.captureState(),
      bodySlots: this.bodySlots(),
      arena: this.arena.captureState(),
      p1: this.p1.captureState(),
      p2: this.p2.captureState(),
      powerUps: this.powerUps.captureState(),
      match: this.state.captureState(),
      ballSender: this.ballSender,
      rng: this.rng.captureState(),
      ...this.p1b && this.p2b ? { p1b: this.p1b.captureState(), p2b: this.p2b.captureState(), lastTouch: { ...this.lastTouch } } : {}
    };
  }
  /**
   * Puts the match back exactly as `captureState` found it.
   *
   * In three moves: make the set of bodies the right one (rebuilding the ball,
   * the streaker or a resized player if a power-up changed them since), put them
   * in the captured order, then write every value back — bodies, contacts,
   * joints, and the plain fields around them.
   */
  restoreState(s) {
    this.arena.restoreShape(s.arena);
    this.p1.restoreShape(s.p1);
    this.p2.restoreShape(s.p2);
    if (this.p1b && s.p1b) this.p1b.restoreShape(s.p1b);
    if (this.p2b && s.p2b) this.p2b.restoreShape(s.p2b);
    this.orderBodies(s.bodySlots);
    this.arena.world.restoreState(s.world);
    this.p1.restoreState(s.p1);
    this.p2.restoreState(s.p2);
    if (this.p1b && s.p1b) this.p1b.restoreState(s.p1b);
    if (this.p2b && s.p2b) this.p2b.restoreState(s.p2b);
    this.powerUps.restoreState(s.powerUps);
    this.state.restoreState(s.match);
    this.ballSender = s.ballSender;
    this.lastTouch = s.lastTouch ? { ...s.lastTouch } : KICKOFF_TOUCH;
    this.rng.restoreState(s.rng);
    this.arena.contactEvents.length = 0;
  }
};

// src/rl/obs.ts
var OBS_SLOTS = {
  /** A drop every 201 ticks lasting 601 ticks: never more than 3 at once. */
  drops: 3,
  /** Measured max 2 (bombs land ~65 ticks after release); one spare. */
  bombs: 3,
  /** Pitch 6 has the most, with 6. */
  props: 6
};
var BLINK_TICKS = 60;
var VEL_SCALE = 500;
var SPIN_SCALE = 20;
var LEG_SCALE = 40;
var PLAYER_LEN = 20;
var BALL_LEN = 12;
var GOALS_LEN = 6;
var STREAKER_LEN = 4;
var DROP_LEN = 5 + POWERUP_KINDS.length;
var BOMB_LEN = 4;
var PROP_LEN = 8;
var MATCH_LEN = 7;
var OBS_DIM = 2 * PLAYER_LEN + BALL_LEN + GOALS_LEN + STREAKER_LEN + OBS_SLOTS.drops * DROP_LEN + OBS_SLOTS.bombs * BOMB_LEN + OBS_SLOTS.props * PROP_LEN + MATCH_LEN;
var OBS_LAYOUT = (() => {
  const me = 0;
  const foe = me + PLAYER_LEN;
  const ball = foe + PLAYER_LEN;
  const goals = ball + BALL_LEN;
  const streaker = goals + GOALS_LEN;
  const drops = streaker + STREAKER_LEN;
  const bombs = drops + OBS_SLOTS.drops * DROP_LEN;
  const props = bombs + OBS_SLOTS.bombs * BOMB_LEN;
  const match = props + OBS_SLOTS.props * PROP_LEN;
  return {
    sections: { me, foe, ball, goals, streaker, drops, bombs, props, match },
    lengths: { player: PLAYER_LEN, ball: BALL_LEN, drop: DROP_LEN, bomb: BOMB_LEN, prop: PROP_LEN },
    /** Offsets inside a player block. */
    player: { x: 0, y: 1, vx: 2, vy: 3, legDx: 4, legDy: 5, legSpin: 6, grounded: 7, speed: 8, jump: 11, size: 14, frozen: 17, bombed: 18, legBroken: 19 },
    /** Offsets inside the ball block. */
    ball: { x: 0, y: 1, vx: 2, vy: 3, spin: 4, size: 5, bouncy: 8, mineLast: 11 },
    /** Offsets inside the match block. */
    match: { scoreDiff: 0, myNeeded: 1, theirNeeded: 2, timed: 3, timeLeft: 4, suddenDeath: 5, side: 6 },
    /** Positions are x / (STAGE_WIDTH / 2) - 1 and y / (STAGE_HEIGHT / 2) - 1. */
    scale: { stageWidth: STAGE_WIDTH, stageHeight: STAGE_HEIGHT, velocity: VEL_SCALE },
    dim: OBS_DIM
  };
})();
var SIZE_ORDER = ["small", "normal", "big"];
var GOAL_ORDER = ["small", "normal", "big"];
function writeObservation(sim, who, out, offset = 0) {
  const flip = who === "p2";
  const me = who === "p1" ? sim.p1 : sim.p2;
  const foe = who === "p1" ? sim.p2 : sim.p1;
  const mx = (x) => flip ? STAGE_WIDTH - x : x;
  const mv = (v) => flip ? -v : v;
  const px = (x) => mx(x) / (STAGE_WIDTH / 2) - 1;
  const py = (y) => y / (STAGE_HEIGHT / 2) - 1;
  let o = offset;
  const put = (v) => {
    out[o++] = v;
  };
  const oneHot = (i, n) => {
    for (let k = 0; k < n; k++) put(k === i ? 1 : 0);
  };
  const level = (v) => oneHot(Math.max(0, Math.min(2, Math.round(v))), 3);
  const writePlayer = (p) => {
    const head = p.head.getPosition();
    const hv = p.head.getLinearVelocity();
    const leg = p.leg.getPosition();
    put(px(head.x));
    put(py(head.y));
    put(mv(hv.x) / VEL_SCALE);
    put(hv.y / VEL_SCALE);
    put(mv(leg.x - head.x) / LEG_SCALE);
    put((leg.y - head.y) / LEG_SCALE);
    put(mv(p.leg.getAngularVelocity()) / SPIN_SCALE);
    put(p.isGrounded() ? 1 : 0);
    level(p.puSpeed);
    level(p.puJump);
    oneHot(SIZE_ORDER.indexOf(p.size), 3);
    put(p.frozen ? 1 : 0);
    put(p.bombed ? 1 : 0);
    put(p.legBroken ? 1 : 0);
  };
  writePlayer(me);
  writePlayer(foe);
  const ball = sim.arena.ball;
  const bp = ball.getPosition();
  const bv = ball.getLinearVelocity();
  put(px(bp.x));
  put(py(bp.y));
  put(mv(bv.x) / VEL_SCALE);
  put(bv.y / VEL_SCALE);
  put(mv(ball.getAngularVelocity()) / SPIN_SCALE);
  level(sim.powerUps.puSize);
  level(sim.powerUps.puBouncy);
  put(sim.ballSender === who ? 1 : 0);
  const myGoal = me.side === "left" ? sim.arena.leftGoalSize : sim.arena.rightGoalSize;
  const theirGoal = me.side === "left" ? sim.arena.rightGoalSize : sim.arena.leftGoalSize;
  oneHot(GOAL_ORDER.indexOf(myGoal), 3);
  oneHot(GOAL_ORDER.indexOf(theirGoal), 3);
  const streaker = sim.arena.streaker;
  if (streaker) {
    const sp = streaker.getPosition();
    put(1);
    put(px(sp.x));
    put(py(sp.y));
    put(mv(streaker.getLinearVelocity().x) / VEL_SCALE);
  } else {
    for (let k = 0; k < STREAKER_LEN; k++) put(0);
  }
  const drops = sim.powerUps.dropped;
  for (let s = 0; s < OBS_SLOTS.drops; s++) {
    const d = drops[s];
    if (!d) {
      for (let k = 0; k < DROP_LEN; k++) put(0);
      continue;
    }
    put(1);
    put(px(d.x));
    put(py(d.y));
    oneHot(POWERUP_KINDS.indexOf(d.kind), POWERUP_KINDS.length);
    put(Math.min(1, dropAge(d) / POWERUP.armTicks));
    put(d.ticksLeft < BLINK_TICKS ? 1 : 0);
  }
  const bombs = [...sim.powerUps.bombs].sort((a, b) => b.y - a.y);
  for (let s = 0; s < OBS_SLOTS.bombs; s++) {
    const b = bombs[s];
    if (!b) {
      for (let k = 0; k < BOMB_LEN; k++) put(0);
      continue;
    }
    put(1);
    put(px(b.x));
    put(py(b.y));
    put(b.ySpeed / 10);
  }
  const props = getPitch(matchPitch(sim.config)).props.map((p) => {
    const isCircle = p.kind === "circle";
    const hw = isCircle ? p.radius ?? 0 : (p.w ?? p.size ?? 0) / 2;
    const hh = isCircle ? p.radius ?? 0 : (p.h ?? p.size ?? 0) / 2;
    const a = 2 * p.rotation * Math.PI / 180;
    return { x: mx(p.x), y: p.y, isCircle, hw, hh, cos: Math.cos(a), sin: (flip ? -1 : 1) * Math.sin(a) };
  }).sort((a, b) => a.x - b.x || a.y - b.y);
  for (let s = 0; s < OBS_SLOTS.props; s++) {
    const p = props[s];
    if (!p) {
      for (let k = 0; k < PROP_LEN; k++) put(0);
      continue;
    }
    put(1);
    put(p.isCircle ? 1 : 0);
    put(p.x / (STAGE_WIDTH / 2) - 1);
    put(py(p.y));
    put(p.hw / LEG_SCALE);
    put(p.hh / LEG_SCALE);
    put(p.cos);
    put(p.sin);
  }
  const st = sim.state;
  const myScore = who === "p1" ? st.p1Score : st.p2Score;
  const theirScore = who === "p1" ? st.p2Score : st.p1Score;
  const timed = st.config.mode === "timed";
  const target = Math.max(1, st.target);
  put((myScore - theirScore) / target);
  put(timed ? 0 : (target - myScore) / target);
  put(timed ? 0 : (target - theirScore) / target);
  put(timed ? 1 : 0);
  put(timed ? st.secondsLeft / Math.max(1, st.config.duration) : 0);
  put(st.suddenDeath ? 1 : 0);
  put(flip ? 1 : 0);
  if (o - offset !== OBS_DIM) {
    throw new Error(`writeObservation wrote ${o - offset} values, expected ${OBS_DIM}`);
  }
  return o;
}

// src/net/statesync.ts
var f64 = new Float64Array(1);
var u32 = new Uint32Array(f64.buffer);
function mix(h, word) {
  h = Math.imul(h ^ word, 16777619);
  return (h ^ h >>> 15) >>> 0;
}
function mixString(h, s) {
  h = mix(h, s.length);
  for (let i = 0; i < s.length; i++) h = mix(h, s.charCodeAt(i));
  return h;
}
function hashSimState(state) {
  let h = 2166136261;
  const walk = (v) => {
    switch (typeof v) {
      case "number":
        f64[0] = v !== v ? NaN : v;
        h = mix(h, 1);
        h = mix(h, u32[0]);
        h = mix(h, u32[1]);
        return;
      case "string":
        h = mix(h, 2);
        h = mixString(h, v);
        return;
      case "boolean":
        h = mix(h, v ? 3 : 4);
        return;
      case "object":
        if (v === null) {
          h = mix(h, 5);
        } else if (Array.isArray(v)) {
          h = mix(h, 6);
          h = mix(h, v.length);
          for (const item of v) walk(item === void 0 ? null : item);
        } else {
          h = mix(h, 7);
          const obj = v;
          for (const key of Object.keys(obj).sort()) {
            if (obj[key] === void 0) continue;
            h = mixString(h, key);
            walk(obj[key]);
          }
          h = mix(h, 8);
        }
        return;
      default:
        h = mix(h, 9);
    }
  };
  walk(state);
  return h >>> 0;
}

// src/rl/replay.ts
var REPLAY_VERSION = 1;
var nibble = (i) => (i.left ? 1 : 0) | (i.right ? 2 : 0) | (i.jump ? 4 : 0) | (i.kick ? 8 : 0);
var unNibble = (n) => ({
  left: (n & 1) !== 0,
  right: (n & 2) !== 0,
  jump: (n & 4) !== 0,
  kick: (n & 8) !== 0
});
var ReplayRecorder = class {
  constructor(config, seed, powerUps) {
    this.config = config;
    this.seed = seed;
    this.powerUps = powerUps;
  }
  digits = [];
  /** Call once per `sim.step`, with the inputs that step was given. */
  record(inputs) {
    this.digits.push(nibble(inputs.p1).toString(16), nibble(inputs.p2).toString(16));
  }
  finish(sim, finished, meta) {
    return {
      version: REPLAY_VERSION,
      config: this.config,
      seed: this.seed,
      powerUps: this.powerUps,
      ticks: this.digits.length / 2,
      inputs: this.digits.join(""),
      finalHash: hashSimState(sim.captureState()),
      finished,
      ...meta ? { meta } : {}
    };
  }
};
var ReplayPlayer = class {
  constructor(replay) {
    this.replay = replay;
    if (replay.version !== REPLAY_VERSION) {
      throw new Error(`replay version ${replay.version}, this build reads ${REPLAY_VERSION}`);
    }
  }
  tick = 0;
  /** Set once the last recorded tick has run: whether the match came out the same. */
  verdict = null;
  get done() {
    return this.tick >= this.replay.ticks;
  }
  /** The buttons for the next tick; nobody presses anything once it runs out. */
  inputs() {
    if (this.done) return { p1: NO_INPUT, p2: NO_INPUT };
    const s = this.replay.inputs;
    return {
      p1: unNibble(parseInt(s[this.tick * 2], 16)),
      p2: unNibble(parseInt(s[this.tick * 2 + 1], 16))
    };
  }
  /** Call straight after each `sim.step`. */
  afterStep(sim) {
    if (!this.replay.powerUps) sim.powerUps.dropped.length = 0;
    if (this.done) return;
    this.tick++;
    if (this.done) {
      this.verdict = hashSimState(sim.captureState()) === this.replay.finalHash ? "match" : "mismatch";
    }
  }
};
function verifyReplay(replay) {
  const sim = new MatchSim(replay.config, replay.seed);
  const player = new ReplayPlayer(replay);
  while (!player.done) {
    const inputs = player.inputs();
    sim.step(() => inputs);
    player.afterStep(sim);
  }
  return player.verdict === "match";
}

// src/rl/env.ts
var NUM_ACTIONS = 12;
function decodeAction(action, who) {
  const move = Math.floor(action / 4) % 3;
  const back = move === 1;
  const forward = move === 2;
  const towardsRight = who === "p1" ? forward : back;
  const towardsLeft = who === "p1" ? back : forward;
  return {
    left: towardsLeft,
    right: towardsRight,
    jump: (action & 2) !== 0,
    kick: (action & 1) !== 0
  };
}
var DEFAULT_ENV = {
  numEnvs: 16,
  seed: 1,
  pitches: [1],
  powerUps: false,
  actionRepeat: 2,
  maxEpisodeTicks: 3600,
  match: { mode: DEFAULT_MATCH.mode, target: DEFAULT_MATCH.target, duration: DEFAULT_MATCH.duration },
  recordEnvs: 0
};
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = a + 1831565813 >>> 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
var NUM_CELLS = NUM_ACTIONS * NUM_ACTIONS;
var FOLLOWS = ["hold", "idle", "policy"];
var TrainingEnv = class {
  config;
  sims = [];
  recorders = [];
  /** Called with every match a recorded env finishes or abandons. */
  onReplay = null;
  episodeTicks = [];
  rng;
  obs;
  constructor(config = {}) {
    this.config = { ...DEFAULT_ENV, ...config, match: { ...DEFAULT_ENV.match, ...config.match } };
    if (this.config.pitches.length === 0) throw new Error("EnvConfig.pitches is empty");
    this.rng = makeRng(this.config.seed);
    this.obs = new Float32Array(this.config.numEnvs * 2 * OBS_DIM);
  }
  get numEnvs() {
    return this.config.numEnvs;
  }
  reset() {
    for (let i = 0; i < this.numEnvs; i++) {
      this.newMatch(i);
      this.episodeTicks[i] = 0;
      this.writeObs(i, this.obs);
    }
    return this.obs;
  }
  /** `actions` is [numEnvs][2], p1 then p2, each in 0..NUM_ACTIONS-1. */
  step(actions) {
    const n = this.numEnvs;
    const reward = new Float32Array(n * 2);
    const terminated = new Uint8Array(n);
    const truncated = new Uint8Array(n);
    const touched = new Uint8Array(n * 2);
    const finalIdx = [];
    const finals = [];
    for (let i = 0; i < n; i++) {
      const sim = this.sims[i];
      const inputs = {
        p1: decodeAction(actions[i * 2], "p1"),
        p2: decodeAction(actions[i * 2 + 1], "p2")
      };
      let report = null;
      for (let r = 0; r < this.config.actionRepeat; r++) {
        report = this.tickSim(i, inputs);
        this.episodeTicks[i]++;
        this.noteTouches(sim, touched, i);
        if (report.goal || report.matchOver) break;
      }
      let ended = false;
      if (report?.goal) {
        const scorer = report.goal === "p1" ? 0 : 1;
        reward[i * 2 + scorer] = 1;
        reward[i * 2 + (1 - scorer)] = -1;
        terminated[i] = 1;
        ended = true;
      } else if (report?.matchOver) {
        terminated[i] = 1;
        ended = true;
      } else if (this.episodeTicks[i] >= this.config.maxEpisodeTicks) {
        truncated[i] = 1;
        ended = true;
      }
      if (ended) {
        const fin = new Float32Array(2 * OBS_DIM);
        writeObservation(sim, "p1", fin, 0);
        writeObservation(sim, "p2", fin, OBS_DIM);
        finalIdx.push(i);
        finals.push(fin);
        this.beginNextEpisode(i, truncated[i] === 1);
      }
      this.writeObs(i, this.obs);
    }
    const finalObs = new Float32Array(finals.length * 2 * OBS_DIM);
    finals.forEach((f, k) => finalObs.set(f, k * 2 * OBS_DIM));
    return { obs: this.obs, reward, terminated, truncated, touched, finalIdx, finalObs };
  }
  /**
   * The normal-form game at env `i`'s current state, for the Nash bot
   * (`docs/GAME_THEORY_PROJECT.md`): every one of the 144 action pairs is
   * played forward `ticks` ticks from here and the end position reported.
   * Scoring the positions is the caller's business.
   *
   * The match is saved first and put back after each pair, so the env is left
   * exactly as it was (`evalcheck` holds this to the bit) and the next `step`
   * plays on as if this was never called. The look-ahead ticks go through the
   * same drop clearing as `step`, so they simulate the same game, but are not
   * recorded in replays, not counted towards `maxEpisodeTicks`, and a goal in
   * one ends that look-ahead instead of starting a new episode.
   *
   * Actions are each player's own, as in `step`: a2 is P2's canonical action.
   */
  evaluate(i, ticks, follow, policy) {
    if (!(i >= 0 && i < this.numEnvs)) throw new Error(`evaluate: no env ${i}`);
    if (!(ticks >= 1 && ticks <= 65535)) throw new Error(`evaluate: ${ticks} ticks is out of range`);
    if (follow === "policy" && !policy) throw new Error("evaluate: follow 'policy' needs a policy file");
    const sim = this.sims[i];
    const saved = sim.captureState();
    const repeat = this.config.actionRepeat;
    const obs = new Float32Array(NUM_CELLS * 2 * OBS_DIM);
    const ticksRun = new Uint16Array(NUM_CELLS);
    const goal = new Int8Array(NUM_CELLS);
    const view2 = new Float32Array(OBS_DIM);
    for (let a1 = 0; a1 < NUM_ACTIONS; a1++) {
      for (let a2 = 0; a2 < NUM_ACTIONS; a2++) {
        const cell = a1 * NUM_ACTIONS + a2;
        if (cell > 0) sim.restoreState(saved);
        let inputs = { p1: decodeAction(a1, "p1"), p2: decodeAction(a2, "p2") };
        let t = 0;
        while (t < ticks) {
          if (t > 0 && t % repeat === 0 && follow !== "hold") {
            if (follow === "idle") {
              inputs = { p1: NO_INPUT, p2: NO_INPUT };
            } else {
              writeObservation(sim, "p1", view2);
              const p1 = decodeAction(policy.argmax(view2), "p1");
              writeObservation(sim, "p2", view2);
              const p2 = decodeAction(policy.argmax(view2), "p2");
              inputs = { p1, p2 };
            }
          }
          const report = this.stepSim(sim, inputs);
          t++;
          if (report.goal) {
            goal[cell] = report.goal === "p1" ? 1 : -1;
            break;
          }
          if (report.matchOver) break;
        }
        ticksRun[cell] = t;
        writeObservation(sim, "p1", obs, cell * 2 * OBS_DIM);
        writeObservation(sim, "p2", obs, (cell * 2 + 1) * OBS_DIM);
      }
    }
    sim.restoreState(saved);
    return { obs, ticks: ticksRun, goal };
  }
  writeObs(i, out) {
    writeObservation(this.sims[i], "p1", out, i * 2 * OBS_DIM);
    writeObservation(this.sims[i], "p2", out, (i * 2 + 1) * OBS_DIM);
  }
  /** Every ball contact the last tick began, credited to the player it touched. */
  noteTouches(sim, touched, i) {
    for (const ev of sim.arena.contactEvents) {
      const a = tagOf(ev.body1);
      const b = tagOf(ev.body2);
      if (a !== "ball" && b !== "ball") continue;
      const other = a === "ball" ? ev.body2 : ev.body1;
      const owner = playerOf(other);
      if (owner) touched[i * 2 + (owner === "p1" ? 0 : 1)] = 1;
    }
  }
  /**
   * After a goal the match carries on exactly as in the game — celebration,
   * kick-off reset, countdown — with nobody pressing anything, until play
   * resumes. A finished or cut-off match is replaced with a fresh one.
   */
  beginNextEpisode(i, cutOff) {
    const sim = this.sims[i];
    if (cutOff || sim.state.phase === "over" || sim.state.result) {
      this.newMatch(i);
    } else {
      this.skipToPlay(i);
      if (sim.state.phase !== "playing") this.newMatch(i);
    }
    this.episodeTicks[i] = 0;
  }
  /**
   * Every tick an env runs goes through here, so a replay holds every one of
   * them — the countdowns included — in the order the sim saw them.
   */
  tickSim(i, inputs) {
    const report = this.stepSim(this.sims[i], inputs);
    this.recorders[i]?.record(inputs);
    return report;
  }
  /** One tick of the game this env plays: the match, then the drop clearing if power-ups are off. */
  stepSim(sim, inputs) {
    const report = sim.step(() => inputs);
    if (!this.config.powerUps) sim.powerUps.dropped.length = 0;
    return report;
  }
  /** Replaces env `i`'s match with a fresh one, handing the old one's replay out. */
  newMatch(i) {
    this.emitReplay(i);
    const pitches = this.config.pitches;
    const pitch = pitches[Math.floor(this.rng() * pitches.length)];
    const seed = Math.floor(this.rng() * 2147483647);
    const config = { ...DEFAULT_MATCH, ...this.config.match, pitch };
    this.sims[i] = new MatchSim(config, seed);
    this.recorders[i] = i < this.config.recordEnvs ? new ReplayRecorder(config, seed, this.config.powerUps) : null;
    this.skipToPlay(i);
  }
  /** Runs the countdown (and a celebration) out; buttons are not read in them anyway. */
  skipToPlay(i) {
    const sim = this.sims[i];
    const idle = { p1: NO_INPUT, p2: NO_INPUT };
    for (let guard = 0; sim.state.phase !== "playing" && guard < 1e4; guard++) {
      if (sim.state.phase === "over") return;
      this.tickSim(i, idle);
    }
  }
  /** Hands out the replays of the matches still in progress (on shutdown). */
  flushReplays() {
    for (let i = 0; i < this.numEnvs; i++) this.emitReplay(i);
  }
  emitReplay(i) {
    const sim = this.sims[i];
    const rec = this.recorders[i];
    if (!sim || !rec) return;
    this.recorders[i] = null;
    const st = sim.state;
    this.onReplay?.(
      rec.finish(sim, st.result !== null, {
        ...this.config.replayMeta,
        env: i,
        score: [st.p1Score, st.p2Score]
      })
    );
  }
};

// src/rl/policy.ts
var PolicyNet = class {
  hidden;
  layers;
  /** One output buffer per layer, so a pass allocates nothing. */
  scratch;
  /**
   * `hidden` is checked when given and worked out from the file's length when
   * not: the float count is h² + h·(inputs + outputs + 2) + outputs, which has
   * one positive root.
   */
  constructor(weights, inputs, outputs, hidden) {
    const all = weights instanceof Float32Array ? weights : new Float32Array(weights);
    const p = inputs + outputs + 2;
    const h = hidden ?? Math.round((-p + Math.sqrt(p * p + 4 * (all.length - outputs))) / 2);
    const shapes = [
      [inputs, h],
      [h, h],
      [h, outputs]
    ];
    const expected = shapes.reduce((n, [i, o]) => n + i * o + o, 0);
    if (h <= 0 || all.length !== expected) {
      throw new Error(
        `policy weights hold ${all.length} floats, which is no ${inputs} -> ${hidden ?? "h"} -> ${outputs} network`
      );
    }
    this.hidden = h;
    let at = 0;
    this.layers = shapes.map(([i, o]) => {
      const w = all.subarray(at, at += i * o);
      const b = all.subarray(at, at += o);
      return { w, b, inputs: i, outputs: o };
    });
    this.scratch = shapes.map(([, o]) => new Float32Array(o));
  }
  /**
   * The raw outputs: logits for an actor, the value (one number) for a critic.
   * The returned array is reused by the next call; copy it to keep it.
   */
  forward(x) {
    let v = x;
    const last = this.layers.length - 1;
    for (let k = 0; k <= last; k++) {
      const { w, b, inputs, outputs } = this.layers[k];
      const out = this.scratch[k];
      for (let o = 0; o < outputs; o++) {
        let s = b[o];
        let at = o * inputs;
        for (let i = 0; i < inputs; i++) s += w[at++] * v[i];
        out[o] = k < last ? Math.tanh(s) : s;
      }
      v = out;
    }
    return v;
  }
  /** The most likely action; the lowest index wins a tie, so the choice is a function of `x`. */
  argmax(x) {
    const z = this.forward(x);
    let best = 0;
    for (let a = 1; a < z.length; a++) if (z[a] > z[best]) best = a;
    return best;
  }
};

// src/rl/server.ts
var PROTOCOL = 2;
console.log = (...args) => console.error(...args);
console.info = console.log;
function readExact(n) {
  const buf = Buffer.alloc(n);
  let got = 0;
  while (got < n) {
    let r;
    try {
      r = (0, import_node_fs.readSync)(0, buf, got, n - got, null);
    } catch (e) {
      if (e.code === "EAGAIN") continue;
      throw e;
    }
    if (r === 0) return null;
    got += r;
  }
  return buf;
}
function writeAll(buf) {
  let sent = 0;
  while (sent < buf.length) {
    try {
      sent += (0, import_node_fs.writeSync)(1, buf, sent, buf.length - sent);
    } catch (e) {
      if (e.code !== "EAGAIN") throw e;
    }
  }
}
function encode(env, r) {
  const n = env.numEnvs;
  const k = r.finalIdx.length;
  const size = 4 + r.obs.byteLength + r.reward.byteLength + r.finalObs.byteLength + 4 * k + n + n + 2 * n;
  const buf = Buffer.alloc(size);
  let o = buf.writeUInt32LE(k, 0);
  const put = (a) => {
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(buf, o);
    o += a.byteLength;
  };
  put(r.obs);
  put(r.reward);
  put(r.finalObs);
  put(Int32Array.from(r.finalIdx));
  put(r.terminated);
  put(r.truncated);
  put(r.touched);
  return buf;
}
function encodeEval(r) {
  const buf = Buffer.alloc(r.obs.byteLength + r.ticks.byteLength + r.goal.byteLength);
  let o = 0;
  for (const a of [r.obs, r.ticks, r.goal]) {
    Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(buf, o);
    o += a.byteLength;
  }
  return buf;
}
function verify(files) {
  let bad = 0;
  for (const f of files) {
    const ok = verifyReplay(JSON.parse((0, import_node_fs.readFileSync)(f, "utf8")));
    if (!ok) bad++;
    process.stdout.write(`${ok ? "OK      " : "MISMATCH"} ${f}
`);
  }
  process.exitCode = bad ? 1 : 0;
}
function main() {
  if (process.argv[2] === "--verify") return verify(process.argv.slice(3));
  const config = JSON.parse(process.argv[2] ?? "{}");
  const { policy: policyFile, ...envConfig } = config;
  const env = new TrainingEnv(envConfig);
  const policy = policyFile ? new PolicyNet(new Uint8Array((0, import_node_fs.readFileSync)(policyFile)).buffer, OBS_DIM, NUM_ACTIONS) : null;
  const n = env.numEnvs;
  const replayDir = config.replayDir;
  if (replayDir) {
    (0, import_node_fs.mkdirSync)(replayDir, { recursive: true });
    let count = 0;
    env.onReplay = (replay) => {
      const tag = `${process.pid}-${String(count++).padStart(5, "0")}`;
      (0, import_node_fs.writeFileSync)((0, import_node_path.join)(replayDir, `${tag}.json`), JSON.stringify(replay));
    };
  }
  writeAll(
    Buffer.from(
      JSON.stringify({
        protocol: PROTOCOL,
        obsDim: OBS_DIM,
        numActions: NUM_ACTIONS,
        numCells: NUM_CELLS,
        follows: FOLLOWS,
        policyHidden: policy?.hidden ?? null,
        numEnvs: n,
        layout: OBS_LAYOUT,
        config: env.config
      }) + "\n"
    )
  );
  for (; ; ) {
    const op = readExact(1);
    if (!op) return env.flushReplays();
    switch (String.fromCharCode(op[0])) {
      case "R": {
        const obs = env.reset();
        writeAll(
          encode(env, {
            obs,
            reward: new Float32Array(n * 2),
            terminated: new Uint8Array(n),
            truncated: new Uint8Array(n),
            touched: new Uint8Array(n * 2),
            finalIdx: [],
            finalObs: new Float32Array(0)
          })
        );
        break;
      }
      case "S": {
        const actions = readExact(n * 2);
        if (!actions) return env.flushReplays();
        for (const a of actions) {
          if (a >= NUM_ACTIONS) throw new Error(`action ${a} out of range`);
        }
        writeAll(encode(env, env.step(actions)));
        break;
      }
      case "E": {
        const body = readExact(9);
        if (!body) return env.flushReplays();
        const follow = FOLLOWS[body[8]];
        if (!follow) throw new Error(`unknown follow ${body[8]}`);
        writeAll(encodeEval(env.evaluate(body.readUInt32LE(0), body.readUInt32LE(4), follow, policy)));
        break;
      }
      case "Q":
        return env.flushReplays();
      default:
        throw new Error(`unknown opcode ${op[0]}`);
    }
  }
}
main();
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  PROTOCOL
});
