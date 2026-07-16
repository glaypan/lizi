/* === Shared Acoustic Simulation Engine === */
(function(window) {
  'use strict';

  var AcousticEngine = {
    W: 800, H: 500, ROOM_PAD: 40,
    ROOM: { x: 40, y: 40, w: 720, h: 420 },
    SPEED: 1, DENSITY: 80, PAUSED: false,

    clamp: function(v, min, max) { return Math.max(min, Math.min(max, v)); },
    lerp: function(a, b, t) { return a + (b - a) * t; },
    dist: function(x1, y1, x2, y2) { return Math.sqrt((x2-x1)*(x2-x1) + (y2-y1)*(y2-y1)); },

    createParticle: function(x, y, vx, vy, color, size, life, maxBounces, trailMax) {
      return {
        x: x, y: y, vx: vx, vy: vy,
        color: color, size: size || 4,
        life: life || 400, maxLife: life || 400,
        bounces: 0, maxBounces: maxBounces || 4,
        trail: [], trailMax: trailMax || 40,
        born: 0
      };
    },

    updateParticle: function(p, speed) {
      p.trail.push({ x: p.x, y: p.y });
      if (p.trail.length > p.trailMax) p.trail.shift();
      p.x += p.vx * speed;
      p.y += p.vy * speed;
      p.life -= speed;

      var R = AcousticEngine.ROOM;
      if (p.x - p.size < R.x) { p.x = R.x + p.size; p.vx = Math.abs(p.vx); p.bounces++; }
      if (p.x + p.size > R.x + R.w) { p.x = R.x + R.w - p.size; p.vx = -Math.abs(p.vx); p.bounces++; }
      if (p.y - p.size < R.y) { p.y = R.y + p.size; p.vy = Math.abs(p.vy); p.bounces++; }
      if (p.y + p.size > R.y + R.h) { p.y = R.y + R.h - p.size; p.vy = -Math.abs(p.vy); p.bounces++; }
      return p.life > 0 && p.bounces < p.maxBounces;
    },

    drawParticle: function(ctx, p, alpha) {
      var a = AcousticEngine.clamp(p.life / p.maxLife, 0, 1) * alpha;
      if (p.trail.length > 1) {
        for (var i = 1; i < p.trail.length; i++) {
          var segA = (i / p.trail.length) * a * 0.75;
          var segW = p.size * 0.65 * (i / p.trail.length);
          ctx.beginPath();
          ctx.moveTo(p.trail[i-1].x, p.trail[i-1].y);
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
          ctx.strokeStyle = p.color.replace('1)', segA + ')');
          ctx.lineWidth = Math.max(0.5, segW);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
        var ls = p.trail[p.trail.length - 1];
        ctx.beginPath();
        ctx.moveTo(ls.x, ls.y);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = p.color.replace('1)', (a * 0.85) + ')');
        ctx.lineWidth = p.size * 0.75;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('1)', (a * 0.12) + ')');
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('1)', a + ')');
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = p.color.replace('1)', (a * 0.9 + 0.1) + ')');
      ctx.fill();
    },

    drawRoom: function(ctx) {
      var R = AcousticEngine.ROOM;
      ctx.strokeStyle = 'rgba(122,133,153,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(R.x, R.y, R.w, R.h);
      ctx.fillStyle = 'rgba(122,133,153,0.3)';
      ctx.font = '10px JetBrainsMono';
      ctx.textAlign = 'center';
      ctx.fillText('WALL', R.x + R.w/2, R.y - 8);
      ctx.fillText('WALL', R.x + R.w/2, R.y + R.h + 16);
    },

    drawOmniSpeaker: function(ctx, cx, cy, t, isDraggable) {
      var r = 14;
      var grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3);
      grd.addColorStop(0, 'rgba(56,189,248,0.15)');
      grd.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(cx, cy, r * 3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath();
      for (var i = 0; i < 16; i++) {
        var a = (Math.PI * 2 / 16) * i + t * 0.2;
        var px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(56,189,248,0.25)';
      ctx.fill();
      ctx.strokeStyle = isDraggable ? '#38bdf8' : 'rgba(56,189,248,0.9)';
      ctx.lineWidth = isDraggable ? 2.5 : 1.5;
      ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(56,189,248,1)'; ctx.fill();
    },

    drawPointSpeaker: function(ctx, cx, cy, t, isDraggable, dirAngle) {
      var r = 12;
      var da = (dirAngle !== undefined) ? dirAngle : 0;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(da);
      var grd = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 2.5);
      grd.addColorStop(0, 'rgba(244,114,182,0.2)');
      grd.addColorStop(1, 'rgba(244,114,182,0)');
      ctx.fillStyle = grd;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(244,114,182,0.25)';
      ctx.fillRect(-r, -r * 0.7, r * 2, r * 1.4);
      ctx.strokeStyle = isDraggable ? '#f472b6' : 'rgba(244,114,182,0.9)';
      ctx.lineWidth = isDraggable ? 2.5 : 1.5;
      ctx.strokeRect(-r, -r * 0.7, r * 2, r * 1.4);
      // Directional cone (rotated)
      ctx.beginPath();
      ctx.moveTo(r, -r * 0.4);
      ctx.lineTo(r + 20, -r * 1.5);
      ctx.lineTo(r + 20, r * 1.5);
      ctx.lineTo(r, r * 0.4);
      ctx.closePath();
      ctx.fillStyle = 'rgba(244,114,182,0.08)'; ctx.fill();
      ctx.strokeStyle = 'rgba(244,114,182,0.35)';
      ctx.setLineDash([4, 4]); ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(244,114,182,1)'; ctx.fill();
      ctx.restore();

      // Direction handle (draggable ring) — drawn in world space, not rotated
      if (isDraggable) {
        var hx = cx + Math.cos(da) * 28;
        var hy = cy + Math.sin(da) * 28;
        // Line from speaker to handle
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(hx, hy);
        ctx.strokeStyle = 'rgba(244,114,182,0.4)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Handle circle
        ctx.beginPath();
        ctx.arc(hx, hy, 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(244,114,182,0.3)';
        ctx.fill();
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Arrow tip on handle
        ctx.beginPath();
        var tipX = cx + Math.cos(da) * 38;
        var tipY = cy + Math.sin(da) * 38;
        ctx.moveTo(hx, hy);
        ctx.lineTo(tipX, tipY);
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 2;
        ctx.stroke();
        // Arrow head
        var a1 = da + 2.5, a2 = da - 2.5;
        ctx.beginPath();
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + Math.cos(a1) * 8, tipY + Math.sin(a1) * 8);
        ctx.moveTo(tipX, tipY);
        ctx.lineTo(tipX + Math.cos(a2) * 8, tipY + Math.sin(a2) * 8);
        ctx.stroke();
      }
    },

    drawListener: function(ctx, cx, cy, isDraggable) {
      ctx.beginPath(); ctx.arc(cx, cy - 4, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(228,236,244,0.6)'; ctx.fill();
      ctx.strokeStyle = isDraggable ? '#e8ecf4' : 'rgba(228,236,244,0.9)';
      ctx.lineWidth = isDraggable ? 2.5 : 1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy + 7, 9, Math.PI + 0.3, -0.3); ctx.stroke();
      ctx.fillStyle = 'rgba(228,236,244,0.5)';
      ctx.font = '9px JetBrainsMono'; ctx.textAlign = 'center';
      ctx.fillText('LISTENER', cx, cy + 24);
    },

    /* === Drag Interaction Manager === */
    DragManager: function(canvas, entities, onChange) {
      var ctx = canvas.getContext('2d');
      var dragging = null;
      var dragMode = null; // 'move' or 'direction'
      var rect = null;

      function getMousePos(e) {
        rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        var clientX = e.touches ? e.touches[0].clientX : e.clientX;
        var clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
          x: (clientX - rect.left) * scaleX,
          y: (clientY - rect.top) * scaleY
        };
      }

      function hitTest(pos) {
        for (var i = entities.length - 1; i >= 0; i--) {
          var e = entities[i];
          if (e.visible === false) continue;
          // Check direction handle first (for point sources with dirAngle)
          if (e.dirAngle !== undefined) {
            var hx = e.x + Math.cos(e.dirAngle) * 28;
            var hy = e.y + Math.sin(e.dirAngle) * 28;
            if (AcousticEngine.dist(pos.x, pos.y, hx, hy) < 14) {
              return { entity: e, mode: 'direction' };
            }
          }
          // Check speaker body
          if (AcousticEngine.dist(pos.x, pos.y, e.x, e.y) < 22) {
            return { entity: e, mode: 'move' };
          }
        }
        return null;
      }

      function clampToRoom(e) {
        var R = AcousticEngine.ROOM;
        e.x = AcousticEngine.clamp(e.x, R.x + 20, R.x + R.w - 20);
        e.y = AcousticEngine.clamp(e.y, R.y + 20, R.y + R.h - 20);
      }

      function onDown(pos) {
        var hit = hitTest(pos);
        if (hit) {
          dragging = hit.entity;
          dragMode = hit.mode;
          canvas.classList.add('grabbing');
        }
      }

      function onMove(pos) {
        if (!dragging) return;
        if (dragMode === 'direction') {
          // Update direction angle based on mouse position relative to speaker
          dragging.dirAngle = Math.atan2(pos.y - dragging.y, pos.x - dragging.x);
        } else {
          dragging.x = pos.x;
          dragging.y = pos.y;
          clampToRoom(dragging);
        }
        if (onChange) onChange(dragging, dragMode);
      }

      function onUp() { dragging = null; dragMode = null; canvas.classList.remove('grabbing'); }

      canvas.addEventListener('mousedown', function(e) { onDown(getMousePos(e)); });
      canvas.addEventListener('mousemove', function(e) { onMove(getMousePos(e)); });
      canvas.addEventListener('mouseup', onUp);
      canvas.addEventListener('mouseleave', onUp);
      canvas.addEventListener('touchstart', function(e) { e.preventDefault(); onDown(getMousePos(e)); }, { passive: false });
      canvas.addEventListener('touchmove', function(e) { e.preventDefault(); onMove(getMousePos(e)); }, { passive: false });
      canvas.addEventListener('touchend', onUp);

      return { getDragging: function() { return dragging; }, getDragMode: function() { return dragMode; } };
    },

    /* === Acoustic Calculations === */
    // Direct sound SPL: inverse square law, reference 1m = 90dB
    calcDirectSPL: function(sx, sy, lx, ly) {
      var d = AcousticEngine.dist(sx, sy, lx, ly);
      var dMeters = d / 40; // 40px = 1m
      if (dMeters < 0.1) dMeters = 0.1;
      return Math.max(0, 90 - 20 * Math.log10(dMeters));
    },

    // Delay in ms (speed of sound = 343 m/s)
    calcDelay: function(sx, sy, lx, ly) {
      var d = AcousticEngine.dist(sx, sy, lx, ly);
      var dMeters = d / 40;
      return (dMeters / 343) * 1000;
    },

    // Calculate reflection paths (ray trace from speaker to listener via walls)
    calcReflections: function(sx, sy, lx, ly, maxBounces) {
      var R = AcousticEngine.ROOM;
      maxBounces = maxBounces || 2;
      var reflections = [];

      // For each wall, compute reflected source point and check if path reaches listener
      // Wall 0: top (y=R.y), Wall 1: bottom (y=R.y+R.h), Wall 2: left (x=R.x), Wall 3: right (x=R.x+R.w)
      var walls = [
        { type: 'h', pos: R.y },         // top
        { type: 'h', pos: R.y + R.h },   // bottom
        { type: 'v', pos: R.x },         // left
        { type: 'v', pos: R.x + R.w }    // right
      ];

      // 1st order reflections
      walls.forEach(function(w, idx) {
        var rx, ry;
        if (w.type === 'h') { rx = sx; ry = 2 * w.pos - sy; }
        else { rx = 2 * w.pos - sx; ry = sy; }
        var d = AcousticEngine.dist(rx, ry, lx, ly);
        var dDirect = AcousticEngine.dist(sx, sy, lx, ly);
        var pathLen = d; // source->reflection point->listener ≈ reflected source->listener
        var dMeters = pathLen / 40;
        var spl = Math.max(0, 84 - 20 * Math.log10(dMeters + 0.1));
        var delay = (dMeters / 343) * 1000;
        reflections.push({
          wallIdx: idx, pathLen: pathLen, spl: spl, delay: delay, order: 1,
          bouncePoint: AcousticEngine.calcBouncePoint(sx, sy, lx, ly, w)
        });
      });

      return reflections;
    },

    calcBouncePoint: function(sx, sy, lx, ly, wall) {
      // Calculate where the ray hits the wall
      if (wall.type === 'h') {
        var t = (wall.pos - sy) / (ly - sy + 0.001);
        var bx = sx + t * (lx - sx);
        return { x: bx, y: wall.pos };
      } else {
        var t = (wall.pos - sx) / (lx - sx + 0.001);
        var by = sy + t * (ly - sy);
        return { x: wall.pos, y: by };
      }
    }
  };

  window.AcousticEngine = AcousticEngine;
})(window);
