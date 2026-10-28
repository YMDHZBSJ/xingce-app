/**
 * 离线 API 层：拦截页面里的 fetch('/api/*')，用本地 JSON 数据应答。
 * 数据结构与网页版 API 完全一致，页面代码无需改动。
 */
(function () {
  'use strict';
  var DATA = '/data/';
  var cache = {};
  var manifest = null, papers = null, kpData = null, qkp = null, stats = null;
  var allPromise = null;

  function j(url) {
    if (cache[url]) return cache[url];
    cache[url] = fetchRaw(url).then(function (r) {
      if (!r.ok) throw new Error('数据加载失败: ' + url);
      return r.json();
    });
    return cache[url];
  }
  var nativeFetch = window.fetch.bind(window);
  function fetchRaw(url) { return nativeFetch(url, { cache: 'no-cache' }); }

  function fixPaths(html) {
    if (!html) return html;
    return String(html).replace(/\.\.\/90-图片\//g, '/images/');
  }

  function transform(q) {
    if (!q) return q;
    var out = Object.assign({}, q);
    out.stem = fixPaths(q.stem);
    out.analysis = fixPaths(q.analysis);
    out.material_content = fixPaths(q.material_content);
    out.images = [];
    return out;
  }

  function getManifest() {
    if (!manifest) manifest = j(DATA + 'manifest.json');
    return manifest;
  }

  function loadModule(name) {
    return getManifest().then(function (mf) {
      var info = mf.modules[name];
      if (!info) return [];
      return j(DATA + info.file);
    });
  }

  function loadAll() {
    if (allPromise) return allPromise;
    allPromise = getManifest().then(function (mf) {
      var names = Object.keys(mf.modules);
      return Promise.all(names.map(loadModule)).then(function (lists) {
        var out = [];
        lists.forEach(function (l) { out = out.concat(l); });
        return out;
      });
    });
    return allPromise;
  }

  function getPapers() {
    if (!papers) papers = j(DATA + 'papers.json');
    return papers;
  }
  function getKp() {
    if (!kpData) kpData = j(DATA + 'kp.json');
    return kpData;
  }
  function getQkp() {
    if (!qkp) qkp = j(DATA + 'qkp.json');
    return qkp;
  }
  function getStats() {
    if (!stats) stats = j(DATA + 'stats.json');
    return stats;
  }

  function flatKps(nodes, acc) {
    acc = acc || [];
    (nodes || []).forEach(function (n) {
      acc.push(n);
      flatKps(n.children, acc);
    });
    return acc;
  }

  function plain(html, max) {
    max = max || 90;
    if (!html) return '';
    var t = String(html).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
    return t.length > max ? t.slice(0, max) + '…' : t;
  }

  function paginate(items, page, pageSize) {
    var total = items.length;
    var start = (page - 1) * pageSize;
    return {
      items: items.slice(start, start + pageSize),
      pagination: { page: page, pageSize: pageSize, total: total, totalPages: Math.max(1, Math.ceil(total / pageSize)) }
    };
  }

  function shufflePick(list, n) {
    var a = list.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var k = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[k]; a[k] = t;
    }
    return a.slice(0, n);
  }

  /* ---------- 各端点 ---------- */
  var handlers = {
    '/api/questions': function (sp) {
      var module = sp.get('module') || '', qtype = sp.get('qtype') || '';
      var year = sp.get('year') || '', region = sp.get('region') || '';
      var paper = sp.get('paper_name') || '';
      var random = sp.get('random') === 'true';
      var page = Math.max(1, parseInt(sp.get('page') || '1', 10));
      var pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '20', 10)));

      var base = module ? loadModule(module) : loadAll();
      return base.then(function (list) {
        var out = list.filter(function (q) {
          if (qtype && q.qtype !== qtype) return false;
          if (year && q.year !== year) return false;
          if (region && q.region !== region) return false;
          if (paper && q.paper_name !== paper) return false;
          return true;
        });
        if (random) {
          var picked = shufflePick(out, pageSize);
          return {
            items: picked.map(transform),
            pagination: { page: 1, pageSize: picked.length, total: out.length, totalPages: 1, random: true }
          };
        }
        var r = paginate(out, page, pageSize);
        r.items = r.items.map(transform);
        return r;
      });
    },

    '/api/questions/batch': function (sp) {
      var ids = (sp.get('ids') || '').split(',').map(function (s) { return parseInt(s.trim(), 10); }).filter(Boolean);
      return loadAll().then(function (all) {
        var map = {};
        all.forEach(function (q) { map[q.id] = q; });
        return { items: ids.map(function (id) { return map[id]; }).filter(Boolean).map(transform) };
      });
    },

    '/api/search': function (sp) {
      var q = sp.get('q') || '', module = sp.get('module') || '', qtype = sp.get('qtype') || '';
      var page = Math.max(1, parseInt(sp.get('page') || '1', 10));
      var pageSize = Math.min(200, Math.max(1, parseInt(sp.get('pageSize') || '20', 10)));
      var base = module ? loadModule(module) : loadAll();
      return base.then(function (list) {
        var out = list.filter(function (item) {
          if (qtype && item.qtype !== qtype) return false;
          if (!q) return true;
          var text = (item.stem || '') + (item.analysis || '') + (item.material_content || '') + JSON.stringify(item.options || []);
          return text.indexOf(q) >= 0;
        });
        var r = paginate(out, page, pageSize);
        r.items = r.items.map(transform);
        return r;
      });
    },

    '/api/papers': function (sp) {
      var year = sp.get('year') || '', region = sp.get('region') || '';
      var q = sp.get('q') || '', module = sp.get('module') || '';
      var page = Math.max(1, parseInt(sp.get('page') || '1', 10));
      var pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') || '20', 10)));
      return getPapers().then(function (list) {
        var out = list.filter(function (p) {
          if (year && p.year !== year) return false;
          if (region && p.region !== region) return false;
          if (q && (p.paper_name || '').indexOf(q) < 0 && (p.region || '').indexOf(q) < 0) return false;
          if (module && !(p.moduleCounts || []).some(function (m) { return m.module === module; })) return false;
          return true;
        });
        var years = {}, regions = {};
        list.forEach(function (p) { if (p.year) years[p.year] = 1; if (p.region) regions[p.region] = 1; });
        var r = paginate(out, page, pageSize);
        return {
          items: r.items,
          total: out.length,
          years: Object.keys(years).sort().reverse(),
          regions: Object.keys(regions).sort(),
          pagination: r.pagination,
          filters: { year: year, region: region, module: module, q: q }
        };
      });
    },

    '/api/stats': function (sp) {
      var module = sp.get('module') || '', year = sp.get('year') || '';
      var region = sp.get('region') || '', qtype = sp.get('qtype') || '';
      return Promise.all([loadAll(), getStats()]).then(function (res) {
        var all = res[0], base = res[1];
        var list = all.filter(function (q) {
          if (module && q.module !== module) return false;
          if (year && q.year !== year) return false;
          if (region && q.region !== region) return false;
          if (qtype && q.qtype !== qtype) return false;
          return true;
        });
        function group(key) {
          var m = {};
          list.forEach(function (q) {
            var k = q[key];
            if (!k) return;
            m[k] = (m[k] || 0) + 1;
          });
          return Object.keys(m).map(function (k) { return [k, m[k]]; })
            .sort(function (a, b) { return b[1] - a[1]; });
        }
        var years = group('year').sort(function (a, b) { return String(a[0]).localeCompare(String(b[0])); });
        var qtypes = group('qtype');
        var cross = {};
        list.forEach(function (q) {
          if (!q.year || !q.qtype) return;
          cross[q.year + '|' + q.qtype] = (cross[q.year + '|' + q.qtype] || 0) + 1;
        });
        var papers = {};
        list.forEach(function (q) { if (q.paper_name) papers[q.paper_name] = 1; });
        return {
          moduleStats: group('module').map(function (x) { return { module: x[0], count: x[1] }; }),
          qtypeStats: qtypes.map(function (x) { return { qtype: x[0], count: x[1] }; }),
          yearStats: years.map(function (x) { return { year: x[0], count: x[1] }; }),
          regionStats: group('region').map(function (x) { return { region: x[0], count: x[1] }; }),
          crossStats: {
            years: years.map(function (x) { return x[0]; }),
            qtypes: qtypes.map(function (x) { return x[0]; }),
            matrix: years.map(function (y) {
              return qtypes.map(function (t) {
                return { year: y[0], qtype: t[0], count: cross[y[0] + '|' + t[0]] || 0 };
              });
            }).reduce(function (a, b) { return a.concat(b); }, [])
          },
          totalQuestions: list.length,
          totalPapers: Object.keys(papers).length,
          options: {
            years: base.options.years,
            regions: base.options.regions,
            modules: base.options.modules,
            qtypes: base.options.qtypes
          },
          filters: { module: module, year: year, region: region, qtype: qtype }
        };
      });
    },

    '/api/kp': function (sp) {
      var module = sp.get('module') || '';
      return getKp().then(function (k) {
        if (!module) return { items: k.items, total: k.total, filters: { module: '' } };
        function prune(nodes) {
          var out = [];
          (nodes || []).forEach(function (n) {
            var kids = prune(n.children);
            if (n.module === module || kids.length) {
              out.push(Object.assign({}, n, { children: kids }));
            }
          });
          return out;
        }
        var items = prune(k.items);
        var total = 0;
        (function count(ns) { ns.forEach(function (n) { total++; count(n.children || []); }); })(items);
        return { items: items, total: total, filters: { module: module } };
      });
    }
  };

  function handleRelated(id, limit) {
    return Promise.all([loadAll(), getKp(), getQkp()]).then(function (res) {
      var all = res[0], kp = res[1], map = res[2];
      var kps = flatKps(kp.items);
      var myKpIds = map[String(id)] || [];
      var knowledgePoints = myKpIds.map(function (kid) {
        var node = kps.filter(function (n) { return n.id === kid; })[0];
        return node ? { id: node.id, name: node.name, description: node.description, module: node.module } : null;
      }).filter(Boolean);

      var idset = {};
      myKpIds.forEach(function (k) { idset[k] = 1; });
      var scored = [];
      all.forEach(function (q) {
        if (q.id === id) return;
        var ks = map[String(q.id)] || [];
        var matched = ks.filter(function (k) { return idset[k]; }).length;
        if (matched > 0) scored.push({ q: q, matched: matched });
      });
      scored.sort(function (a, b) { return b.matched - a.matched; });
      var related = shufflePick(scored, limit).map(function (s) {
        return {
          id: s.q.id, qtype: s.q.qtype, module: s.q.module, year: s.q.year,
          region: s.q.region, stem: plain(s.q.stem), matched: s.matched
        };
      });
      var self = all.filter(function (x) { return x.id === id; })[0] || {};
      return {
        knowledgePoints: knowledgePoints,
        relatedQuestions: related,
        question: { id: self.id, module: self.module, qtype: self.qtype, analysis: fixPaths(self.analysis) }
      };
    });
  }

  function handleQuestion(id) {
    return Promise.all([loadAll(), getKp(), getQkp()]).then(function (res) {
      var q = res[0].filter(function (x) { return x.id === id; })[0];
      if (!q) return { error: 'Question not found' };
      var kps = flatKps(res[1].items);
      var ids = res[2][String(id)] || [];
      var kpList = ids.map(function (kid) { return kps.filter(function (n) { return n.id === kid; })[0]; }).filter(Boolean);
      return Object.assign(transform(q), { knowledgePoints: kpList });
    });
  }

  function handleKpDetail(id) {
    return Promise.all([loadAll(), getKp(), getQkp()]).then(function (res) {
      var all = res[0], kp = res[1], map = res[2];
      var kps = flatKps(kp.items);
      var self = kps.filter(function (n) { return n.id === id; })[0];
      if (!self) return { error: 'Knowledge point not found' };
      var qids = Object.keys(map).filter(function (qid) {
        return (map[qid] || []).indexOf(id) >= 0;
      }).map(function (s) { return parseInt(s, 10); });
      var mapById = {};
      all.forEach(function (q) { mapById[q.id] = q; });
      var questions = qids.map(function (qid) { return mapById[qid]; }).filter(Boolean).map(transform);
      var rels = kp.relations || [];
      var out = [], inc = [];
      rels.forEach(function (r) {
        if (r.source_kp_id === id) {
          var t = kps.filter(function (n) { return n.id === r.target_kp_id; })[0];
          if (t) out.push(Object.assign({}, t, { relation_type: r.relation_type, relation_description: r.description }));
        }
        if (r.target_kp_id === id) {
          var s = kps.filter(function (n) { return n.id === r.source_kp_id; })[0];
          if (s) inc.push(Object.assign({}, s, { relation_type: r.relation_type, relation_description: r.description }));
        }
      });
      return Object.assign({}, self, {
        parent: self.parent_id ? kps.filter(function (n) { return n.id === self.parent_id; })[0] || null : null,
        children: kps.filter(function (n) { return n.parent_id === id; }),
        questions: questions,
        relatedKps: { outgoing: out, incoming: inc }
      });
    });
  }

  function route(pathname) {
    if (pathname === '/api/questions') return handlers['/api/questions'];
    if (pathname === '/api/questions/batch') return handlers['/api/questions/batch'];
    if (pathname === '/api/search') return handlers['/api/search'];
    if (pathname === '/api/papers') return handlers['/api/papers'];
    if (pathname === '/api/stats') return handlers['/api/stats'];
    if (pathname === '/api/kp') return handlers['/api/kp'];
    var m;
    if ((m = pathname.match(/^\/api\/question\/(\d+)\/related$/))) {
      var rid = parseInt(m[1], 10);
      return function (sp) { return handleRelated(rid, Math.min(10, Math.max(1, parseInt(sp.get('limit') || '5', 10)))); };
    }
    if ((m = pathname.match(/^\/api\/question\/(\d+)$/))) {
      var qid = parseInt(m[1], 10);
      return function () { return handleQuestion(qid); };
    }
    if ((m = pathname.match(/^\/api\/kp\/(\d+)$/))) {
      var kid = parseInt(m[1], 10);
      return function () { return handleKpDetail(kid); };
    }
    if (pathname === '/api/sync') {
      return function () { return { ok: true, offline: true }; };
    }
    return null;
  }

  window.fetch = function (input, init) {
    try {
      var url = typeof input === 'string' ? input : (input && input.url) || '';
      var u = new URL(url, window.location.origin);
      if (u.pathname.indexOf('/api/') === 0) {
        var handler = route(u.pathname);
        if (handler) {
          var p = Promise.resolve(handler(u.searchParams)).then(function (data) {
            return new Response(JSON.stringify(data), {
              status: 200, headers: { 'Content-Type': 'application/json' }
            });
          });
          return p;
        }
      }
    } catch (e) { /* 回退原生 fetch */ }
    return nativeFetch(input, init);
  };

  window.__LOCAL_API__ = true;
})();
