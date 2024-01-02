
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\queryBuilder\BasicSelectInput.svelte generated by Svelte v3.48.0 */
    const file$9 = "src\\components\\queryBuilder\\BasicSelectInput.svelte";

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    // (16:4) {#if items}
    function create_if_block$5(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (!/*defaultValue*/ ctx[2]) return create_if_block_1$5;
    		return create_else_block$5;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(16:4) {#if items}",
    		ctx
    	});

    	return block;
    }

    // (23:8) {:else}
    function create_else_block$5(ctx) {
    	let option;
    	let each_1_anchor;
    	let each_value_1 = /*items*/ ctx[0];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "-";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			option.__value = "";
    			option.value = option.__value;
    			add_location(option, file$9, 23, 12, 730);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items, defaultValue*/ 5) {
    				each_value_1 = /*items*/ ctx[0];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$5.name,
    		type: "else",
    		source: "(23:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (17:8) {#if !defaultValue}
    function create_if_block_1$5(ctx) {
    	let option0;
    	let option1;
    	let each_1_anchor;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			option0 = element("option");
    			option0.textContent = "Klikni pro výběr";
    			option1 = element("option");
    			option1.textContent = "-";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.selected = true;
    			option0.disabled = true;
    			option0.hidden = true;
    			add_location(option0, file$9, 17, 12, 480);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$9, 18, 12, 561);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option0, anchor);
    			insert_dev(target, option1, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option0);
    			if (detaching) detach_dev(option1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$5.name,
    		type: "if",
    		source: "(17:8) {#if !defaultValue}",
    		ctx
    	});

    	return block;
    }

    // (28:16) {:else}
    function create_else_block_1$2(ctx) {
    	let option;
    	let t_value = /*item*/ ctx[5] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*item*/ ctx[5];
    			option.value = option.__value;
    			add_location(option, file$9, 28, 20, 951);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*items*/ 1 && option_value_value !== (option_value_value = /*item*/ ctx[5])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(28:16) {:else}",
    		ctx
    	});

    	return block;
    }

    // (26:16) {#if item == defaultValue}
    function create_if_block_2$4(ctx) {
    	let option;
    	let t_value = /*item*/ ctx[5] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*item*/ ctx[5];
    			option.value = option.__value;
    			option.selected = true;
    			add_location(option, file$9, 26, 20, 859);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*items*/ 1 && option_value_value !== (option_value_value = /*item*/ ctx[5])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$4.name,
    		type: "if",
    		source: "(26:16) {#if item == defaultValue}",
    		ctx
    	});

    	return block;
    }

    // (25:12) {#each items as item}
    function create_each_block_1$1(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*item*/ ctx[5] == /*defaultValue*/ ctx[2]) return create_if_block_2$4;
    		return create_else_block_1$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(25:12) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    // (20:12) {#each items as item}
    function create_each_block$3(ctx) {
    	let option;
    	let t_value = /*item*/ ctx[5] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*item*/ ctx[5];
    			option.value = option.__value;
    			add_location(option, file$9, 20, 16, 642);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*items*/ 1 && t_value !== (t_value = /*item*/ ctx[5] + "")) set_data_dev(t, t_value);

    			if (dirty & /*items*/ 1 && option_value_value !== (option_value_value = /*item*/ ctx[5])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(20:12) {#each items as item}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$9(ctx) {
    	let t0;
    	let t1;
    	let select;
    	let mounted;
    	let dispose;
    	let if_block = /*items*/ ctx[0] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			t0 = text(/*desc*/ ctx[1]);
    			t1 = space();
    			select = element("select");
    			if (if_block) if_block.c();
    			set_style(select, "width", "auto");
    			add_location(select, file$9, 14, 0, 370);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, select, anchor);
    			if (if_block) if_block.m(select, null);

    			if (!mounted) {
    				dispose = listen_dev(select, "input", /*handleEvent*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*desc*/ 2) set_data_dev(t0, /*desc*/ ctx[1]);

    			if (/*items*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$5(ctx);
    					if_block.c();
    					if_block.m(select, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(select);
    			if (if_block) if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BasicSelectInput', slots, []);
    	const dispatch = createEventDispatcher();
    	let { items } = $$props;
    	let { desc = "" } = $$props;
    	let { defaultValue = "" } = $$props;

    	function handleEvent(event) {
    		dispatch("change", {
    			newValue: event.srcElement.value,
    			index: items.indexOf(event.srcElement.value)
    		});
    	}

    	const writable_props = ['items', 'desc', 'defaultValue'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BasicSelectInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('desc' in $$props) $$invalidate(1, desc = $$props.desc);
    		if ('defaultValue' in $$props) $$invalidate(2, defaultValue = $$props.defaultValue);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		items,
    		desc,
    		defaultValue,
    		handleEvent
    	});

    	$$self.$inject_state = $$props => {
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    		if ('desc' in $$props) $$invalidate(1, desc = $$props.desc);
    		if ('defaultValue' in $$props) $$invalidate(2, defaultValue = $$props.defaultValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [items, desc, defaultValue, handleEvent];
    }

    class BasicSelectInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, { items: 0, desc: 1, defaultValue: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BasicSelectInput",
    			options,
    			id: create_fragment$9.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*items*/ ctx[0] === undefined && !('items' in props)) {
    			console.warn("<BasicSelectInput> was created without expected prop 'items'");
    		}
    	}

    	get items() {
    		throw new Error("<BasicSelectInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set items(value) {
    		throw new Error("<BasicSelectInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get desc() {
    		throw new Error("<BasicSelectInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set desc(value) {
    		throw new Error("<BasicSelectInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get defaultValue() {
    		throw new Error("<BasicSelectInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set defaultValue(value) {
    		throw new Error("<BasicSelectInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryBuilder\InfoSign.svelte generated by Svelte v3.48.0 */

    const file$8 = "src\\components\\queryBuilder\\InfoSign.svelte";

    function create_fragment$8(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = "./info.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "title", /*text*/ ctx[0]);
    			attr_dev(img, "width", "16");
    			attr_dev(img, "height", "16");
    			attr_dev(img, "alt", "text");
    			attr_dev(img, "class", "svelte-1oeab5f");
    			add_location(img, file$8, 11, 0, 164);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) {
    				attr_dev(img, "title", /*text*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InfoSign', slots, []);
    	let { text = "" } = $$props;
    	const writable_props = ['text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InfoSign> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ text });

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text];
    }

    class InfoSign$1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { text: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InfoSign",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get text() {
    		throw new Error("<InfoSign>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<InfoSign>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryBuilder\NumberInput.svelte generated by Svelte v3.48.0 */
    const file$7 = "src\\components\\queryBuilder\\NumberInput.svelte";

    function create_fragment$7(ctx) {
    	let div;
    	let select;
    	let option0;
    	let option1;
    	let option2;
    	let option3;
    	let option4;
    	let t5;
    	let input;
    	let t6;
    	let infosign;
    	let current;
    	let mounted;
    	let dispose;

    	infosign = new InfoSign$1({
    			props: {
    				text: "Zadejte číslo v očekávaných jednotkách (e.g. cm, kg, km)"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Méně než";
    			option1 = element("option");
    			option1.textContent = "Méně nebo rovno";
    			option2 = element("option");
    			option2.textContent = "Více než";
    			option3 = element("option");
    			option3.textContent = "Více nebo rovno";
    			option4 = element("option");
    			option4.textContent = "Rovno";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			create_component(infosign.$$.fragment);
    			option0.__value = "Méně než";
    			option0.value = option0.__value;
    			add_location(option0, file$7, 28, 8, 800);
    			option1.__value = "Méně nebo rovno";
    			option1.value = option1.__value;
    			add_location(option1, file$7, 29, 8, 852);
    			option2.__value = "Více než";
    			option2.value = option2.__value;
    			add_location(option2, file$7, 30, 8, 918);
    			option3.__value = "Více nebo rovno";
    			option3.value = option3.__value;
    			add_location(option3, file$7, 31, 8, 970);
    			option4.__value = "Rovno";
    			option4.value = option4.__value;
    			add_location(option4, file$7, 32, 8, 1036);
    			add_location(select, file$7, 27, 4, 694);
    			attr_dev(input, "type", "number");
    			set_style(input, "width", "120px");
    			input.value = /*defaultValue*/ ctx[0];
    			attr_dev(input, "placeholder", "000");
    			add_location(input, file$7, 34, 4, 1093);
    			attr_dev(div, "class", "svelte-168hosb");
    			add_location(div, file$7, 26, 0, 683);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(select, option2);
    			append_dev(select, option3);
    			append_dev(select, option4);

    			select_option(select, /*defaultInterval*/ ctx[1]
    			? /*defaultInterval*/ ctx[1]
    			: "Méně než");

    			append_dev(div, t5);
    			append_dev(div, input);
    			append_dev(div, t6);
    			mount_component(infosign, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(select, "change", /*handleIntervalChange*/ ctx[3], false, false, false),
    					listen_dev(input, "change", /*handleInputChange*/ ctx[2], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(infosign);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NumberInput', slots, []);
    	const dispatch = createEventDispatcher();
    	let { tripleDetails } = $$props;
    	let defaultValue = tripleDetails.selectedValue;
    	let defaultInterval = tripleDetails.selectedNumberInterval;

    	function handleInputChange(event) {
    		dispatch("InputChange", { inputValue: event.srcElement.value });
    	}

    	function handleIntervalChange(event) {
    		dispatch("IntervalChange", { newValue: event.srcElement.value });
    	}

    	const writable_props = ['tripleDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NumberInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tripleDetails' in $$props) $$invalidate(4, tripleDetails = $$props.tripleDetails);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		InfoSign: InfoSign$1,
    		tripleDetails,
    		defaultValue,
    		defaultInterval,
    		handleInputChange,
    		handleIntervalChange
    	});

    	$$self.$inject_state = $$props => {
    		if ('tripleDetails' in $$props) $$invalidate(4, tripleDetails = $$props.tripleDetails);
    		if ('defaultValue' in $$props) $$invalidate(0, defaultValue = $$props.defaultValue);
    		if ('defaultInterval' in $$props) $$invalidate(1, defaultInterval = $$props.defaultInterval);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		defaultValue,
    		defaultInterval,
    		handleInputChange,
    		handleIntervalChange,
    		tripleDetails
    	];
    }

    class NumberInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { tripleDetails: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NumberInput",
    			options,
    			id: create_fragment$7.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tripleDetails*/ ctx[4] === undefined && !('tripleDetails' in props)) {
    			console.warn("<NumberInput> was created without expected prop 'tripleDetails'");
    		}
    	}

    	get tripleDetails() {
    		throw new Error("<NumberInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tripleDetails(value) {
    		throw new Error("<NumberInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryBuilder\DateInput.svelte generated by Svelte v3.48.0 */
    const file$6 = "src\\components\\queryBuilder\\DateInput.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let t0;
    	let select0;
    	let option0;
    	let option1;
    	let option2;
    	let t4;
    	let select1;
    	let option3;
    	let option4;
    	let option5;
    	let t8;
    	let input;
    	let t9;
    	let infosign;
    	let current;
    	let mounted;
    	let dispose;

    	infosign = new InfoSign$1({
    			props: {
    				text: "Musíte zadat celý datum, aby se uložil"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div = element("div");
    			t0 = text("S přesností:\r\n    ");
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Rok";
    			option1 = element("option");
    			option1.textContent = "Měsíc";
    			option2 = element("option");
    			option2.textContent = "Den";
    			t4 = space();
    			select1 = element("select");
    			option3 = element("option");
    			option3.textContent = "Před";
    			option4 = element("option");
    			option4.textContent = "Po";
    			option5 = element("option");
    			option5.textContent = "Přesně";
    			t8 = space();
    			input = element("input");
    			t9 = space();
    			create_component(infosign.$$.fragment);
    			option0.__value = "Rok";
    			option0.value = option0.__value;
    			add_location(option0, file$6, 35, 8, 997);
    			option1.__value = "Měsíc";
    			option1.value = option1.__value;
    			add_location(option1, file$6, 36, 8, 1039);
    			option2.__value = "Den";
    			option2.value = option2.__value;
    			add_location(option2, file$6, 37, 8, 1085);
    			add_location(select0, file$6, 34, 4, 893);
    			option3.__value = "Před";
    			option3.value = option3.__value;
    			add_location(option3, file$6, 40, 8, 1234);
    			option4.__value = "Po";
    			option4.value = option4.__value;
    			add_location(option4, file$6, 41, 8, 1278);
    			option5.__value = "Přesně";
    			option5.value = option5.__value;
    			add_location(option5, file$6, 42, 8, 1318);
    			add_location(select1, file$6, 39, 4, 1138);
    			attr_dev(input, "type", "date");
    			input.value = /*defaultValue*/ ctx[0];
    			attr_dev(input, "placeholder", "");
    			add_location(input, file$6, 44, 4, 1377);
    			attr_dev(div, "class", "svelte-168hosb");
    			add_location(div, file$6, 32, 0, 864);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, t0);
    			append_dev(div, select0);
    			append_dev(select0, option0);
    			append_dev(select0, option1);
    			append_dev(select0, option2);

    			select_option(select0, /*defaultPrecision*/ ctx[2]
    			? /*defaultPrecision*/ ctx[2]
    			: "Rok");

    			append_dev(div, t4);
    			append_dev(div, select1);
    			append_dev(select1, option3);
    			append_dev(select1, option4);
    			append_dev(select1, option5);

    			select_option(select1, /*defaultPeriod*/ ctx[1]
    			? /*defaultPeriod*/ ctx[1]
    			: "Před");

    			append_dev(div, t8);
    			append_dev(div, input);
    			append_dev(div, t9);
    			mount_component(infosign, div, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*handlePrecisionChange*/ ctx[5], false, false, false),
    					listen_dev(select1, "change", /*handlePeriodChange*/ ctx[4], false, false, false),
    					listen_dev(input, "change", /*handleInputChange*/ ctx[3], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(infosign);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('DateInput', slots, []);
    	const dispatch = createEventDispatcher();
    	let { tripleDetails } = $$props;
    	let defaultValue = tripleDetails.selectedValue;
    	let defaultPeriod = tripleDetails.selectedTimePeriod;
    	let defaultPrecision = tripleDetails.selectedTimePrecision;

    	function handleInputChange(event) {
    		dispatch("InputChange", { inputValue: event.srcElement.value });
    	}

    	function handlePeriodChange(event) {
    		dispatch("PeriodChange", { newValue: event.srcElement.value });
    	}

    	function handlePrecisionChange(event) {
    		dispatch("PrecisionChange", { newValue: event.srcElement.value });
    	}

    	const writable_props = ['tripleDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<DateInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('tripleDetails' in $$props) $$invalidate(6, tripleDetails = $$props.tripleDetails);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		InfoSign: InfoSign$1,
    		dispatch,
    		tripleDetails,
    		defaultValue,
    		defaultPeriod,
    		defaultPrecision,
    		handleInputChange,
    		handlePeriodChange,
    		handlePrecisionChange
    	});

    	$$self.$inject_state = $$props => {
    		if ('tripleDetails' in $$props) $$invalidate(6, tripleDetails = $$props.tripleDetails);
    		if ('defaultValue' in $$props) $$invalidate(0, defaultValue = $$props.defaultValue);
    		if ('defaultPeriod' in $$props) $$invalidate(1, defaultPeriod = $$props.defaultPeriod);
    		if ('defaultPrecision' in $$props) $$invalidate(2, defaultPrecision = $$props.defaultPrecision);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		defaultValue,
    		defaultPeriod,
    		defaultPrecision,
    		handleInputChange,
    		handlePeriodChange,
    		handlePrecisionChange,
    		tripleDetails
    	];
    }

    class DateInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { tripleDetails: 6 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "DateInput",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tripleDetails*/ ctx[6] === undefined && !('tripleDetails' in props)) {
    			console.warn("<DateInput> was created without expected prop 'tripleDetails'");
    		}
    	}

    	get tripleDetails() {
    		throw new Error("<DateInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tripleDetails(value) {
    		throw new Error("<DateInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* ----Warning-----
    These values were roughly manually sifted through
    Otherwise it can end up with stuff like Měna: ["Převod do jednotek SI"]
    Také jsou přidané pár custom written properties: [Jméno (Nahradilo různé vlastnosti na jména)]
    */
    const queryEntityProperties = {
        "Člověk": ["Bydliště","Choť","Datum křtu","Datum narození","Datum pohřbu nebo kremace","Datum úmrtí","Dílo","Dítě","Hmotnost","Jméno","Matka","Místo narození","Místo působení","Místo úmrtí","Národnost","Období působení","Obrázek","Otec","Ovlivněn (kým)","Ovládané jazyky","Pohlaví","Povolání","Pseudonym","Přezdívka","Příjmení","Příčina smrti","Rodné jméno","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Významná osoba","Výška","Zaměstnavatel","Zaměření","Zdravotní postižení","Zkráceně","Způsob smrti","Člen (čeho)","Škola","Životní partner"],
        "Budova": ["Architekt","Architektonický styl","Barva","Do","Kód Emporis","Kód Structurae","Nachází se v administrativní jednotce","Nadzemní podlaží","Název","Nemá část","Oficiální web","Plná poštovní adresa","Podzemní podlaží","Použitý materiál","Poštovní směrovací číslo","Skládá se z","Stav užívání","Stát","Tvar","Ulice","Uživatel budovy","Zeměpisné souřadnice","Zhotovitel"],
        "Státní útvar": ["Gini koeficient","Diplomatický vztah","Dluh ústřední vlády jako procento HDP","Doména nejvyššího řádu","Erb","Forma vlády","Hlava státu","Hlavní město","Hraničí s","Hymna","Index lidského rozvoje", "Kontinent","Kód země (ISO 3166-1 numeric)","Mapa polohy","Maritime identification digits","Mezinárodní telefonní předvolba","Měna","Nahrávka výslovnosti","Název","Nejjižnější bod","Nejnižší bod","Nejsevernější bod","Nejvyšší bod","Nejvýchodnější bod","Nejzápadnější bod","Nižší správní celky","Obrázek erbu","Obrázek vlajky","Oficiální web","Plošná výměra","Pojmenováno po","Počet obyvatel","Představitel","Strana silničního provozu","Stát","Užívaný jazyk","Vlajka","Vrcholný orgán soudní moci","Zeměpisné souřadnice","Úřední jazyk","Časové pásmo","Člen (čeho)"],
        "Bydliště": ["Architekt","Geografický tvar","Nejjižnější bod","Nejsevernější bod","Nejvýchodnější bod","Nejzápadnější bod","Plná poštovní adresa","Plošná výměra","Stát","Tvar","Zeměpisné souřadnice"],
        "Choť": ["Bydliště","Choť","Datum křtu","Datum narození","Datum pohřbu nebo kremace","Datum úmrtí","Dílo","Dítě","Hmotnost","Jméno","Matka","Místo narození","Místo působení","Místo úmrtí","Národnost","Období působení","Obrázek","Otec","Ovládané jazyky","Pohlaví","Povolání","Pseudonym","Přezdívka","Příjmení","Příčina smrti","Rodné jméno","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Významná osoba","Výška","Zaměstnavatel","Zaměření","Zdravotní postižení","Zkráceně","Způsob smrti","Člen (čeho)","Škola","Životní partner"],
        "Datum křtu": ["Den v týdnu"],
        "Datum narození": ["Den v týdnu"],
        "Datum pohřbu nebo kremace": ["Den v týdnu"],
        "Datum úmrtí": ["Den v týdnu"],
        "Dílo": ["Autor","Celé dílo dostupné na","Datum vytvoření / založení","Distribuce","Editor","Hlavní téma díla","Jazyk díla/jména","Místo vzniku","Objednavatel","Obrázek","Ocenění","Postavy","Premiérové vysílání","Sbírka","Sponzor","Zamýšlená cílová skupina","Žánr"],
        "Dítě": [],
        "Hmotnost": ["Značka veličiny"],
        "Jméno při narození": ["Jazyk díla/jména","Jméno v rodném jazyce","Kolínská fonetika","Písmo","V původním jazyce"],
        "Jméno v rodném jazyce": [],
        "Matka": ["Bydliště","Choť","Datum křtu","Datum narození","Datum pohřbu nebo kremace","Datum úmrtí","Dílo","Dítě","Hmotnost","Jméno","Matka","Místo narození","Místo působení","Místo úmrtí","Národnost","Období působení","Obrázek","Otec","Ovlivněn (kým)","Ovládané jazyky","Pohlaví","Povolání","Pseudonym","Přezdívka","Příjmení","Příčina smrti","Rodné jméno","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Významná osoba","Výška","Zaměstnavatel","Zaměření","Zdravotní postižení","Zkráceně","Způsob smrti","Člen (čeho)","Škola","Životní partner"],
        "Místo narození": ["Nachází se v administrativní jednotce","Obrázek","Plná poštovní adresa","Stát","Zeměpisné souřadnice"],
        "Místo působení": ["Nachází se v administrativní jednotce","Nadmořská výška","Stát","Zeměpisné souřadnice"],
        "Místo úmrtí": [],
        "Národnost": ["Počet obyvatel","Vyznání"],
        "Období působení": [],
        "Obrázek": ["Datum vytvoření / založení","Tvůrce","Výška","Zobrazuje","Šířka","Žánr"],
        "Otec": ["Bydliště","Choť","Datum křtu","Datum narození","Datum pohřbu nebo kremace","Datum úmrtí","Dítě","Hmotnost","Jméno","Matka","Místo narození","Místo působení","Místo úmrtí","Národnost","Období působení","Obrázek","Otec","Ovlivněn (kým)","Ovládané jazyky","Pohlaví","Povolání","Pseudonym","Přezdívka","Příjmení","Příčina smrti","Rodné jméno","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Významná osoba","Výška","Zaměstnavatel","Zaměření","Zdravotní postižení","Zkráceně","Způsob smrti","Člen (čeho)","Škola","Životní partner"],
        "Ovlivněn (kým)": [],
        "Ovládané jazyky": ["Mapa rozšíření"],
        "Pohlaví": [],
        "Povolání": ["Mužská varianta štítku","Obor tohoto povolání","Obrázek","Ženská varianta štítku"],
        "Pseudonym": [],
        "Přezdívka": [],
        "Příjmení": ["Jazyk díla/jména","Kolínská fonetika","Písmo","V původním jazyce"],
        "Příčina smrti": [],
        "Rodné jméno": ["Identické příjmení","Jazyk díla/jména","Jmeniny","Kolínská fonetika","Nahrávka výslovnosti","Písmo","Rodné jméno druhého pohlaví","V původním jazyce"],
        "Sourozenec": [],
        "Stranická příslušnost": ["Datum vytvoření / založení","Datum zániku","Fax","Generální ředitel","Logo","Motto","Oblast působnosti","Obrázek","Oficiální web","Politické směřování","Počet členů","Předseda","Sídlo","Telefonní číslo","Zakladatel"],
        "Státní občanství": [],
        "Ve funkci": ["Organizace řízená z této funkce","Zahrnuje"],
        "Vyznání": [],
        "Významná osoba": [],
        "Výška": ["Značka veličiny"],
        "Zaměstnavatel": [],
        "Zaměření": [],
        "Zdravotní postižení": ["Příznaky","Zasahuje"],
        "Zkráceně": [],
        "Způsob smrti": [],
        "Člen (čeho)": [],
        "Škola": ["Počet studentů","Zaměření"],
        "Životní partner": ["Bydliště","Choť","Datum křtu","Datum narození","Datum pohřbu nebo kremace","Datum úmrtí","Dílo","Dítě","Hmotnost","Jméno","Matka","Místo narození","Místo působení","Místo úmrtí","Národnost","Období působení","Obrázek","Otec","Ovlivněn (kým)","Ovládané jazyky","Pohlaví","Povolání","Pseudonym","Přezdívka","Příjmení","Příčina smrti","Rodné jméno","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Významná osoba","Výška","Zaměstnavatel","Zaměření","Zdravotní postižení","Zkráceně","Způsob smrti","Člen (čeho)","Škola","Životní partner"],
        "Architekt": ["Jméno na Twitteru","Logo","Oblast působnosti","Oficiální web","Počet odběratelů na sociálních sítích","Stát","Telefonní číslo","Člen (čeho)"],
        "Architektonický styl": [],
        "Barva": [],
        "Do": ["Den v týdnu"],
        "Kategorie na Commons": ["Téma kategorie"],
        "Kód Emporis": [],
        "Kód Structurae": [],
        "Nachází se v administrativní jednotce": ["Facebook Places ID","Datum vytvoření / založení","Datum zániku","Míra nezaměstnanosti","Na území současného administrativního celku","Nachází se v administrativní jednotce","Nejjižnější bod","Nejsevernější bod","Nejvýchodnější bod","Nejzápadnější bod","Nižší správní celky","Oficiální název","Oficiální symbol","Plošná výměra","Poznávací značka","Počet domácností","Představitel","Seznam památek","Síťové napětí","Věková hranice pro uzavření manželství","Zeměpisné souřadnice"],
        "Nadzemní podlaží": [],
        "Nemá část": [],
        "Plná poštovní adresa": ["Nachází se v administrativní jednotce","Stát"],
        "Podzemní podlaží": [],
        "Použitý materiál": ["Charakterizováno (čím)","Emisivita","Uhlíková stopa"],
        "Poštovní směrovací číslo": [],
        "Skládá se z": [],
        "Stav užívání": [],
        "Stát": ["Facebook Places ID","Gini koeficient","Datum vytvoření / založení","Datum zániku","Diplomatický vztah","Dluh ústřední vlády jako procento HDP","Doména nejvyššího řádu","Forma vlády","Hlava státu","Hlavní město","Hraničí s","Hymna","Index lidského rozvoje","Kontinent","Kód země (ISO 3166-1 numeric)","Kód země podle Mezinárodního olympijského výboru","Mapa polohy","Maritime identification digits","Mezinárodní telefonní předvolba","Míra nezaměstnanosti","Měna","Na území současného administrativního celku","Nachází se v administrativní jednotce","Nahrávka výslovnosti","Nejjižnější bod","Nejnižší bod","Nejsevernější bod","Nejvyšší bod","Nejvýchodnější bod","Nejzápadnější bod","Nižší správní celky","Obrázek erbu","Obrázek vlajky","Oficiální název","Oficiální symbol","Oficiální web","Plošná výměra","Pojmenováno po","Poznávací značka","Počet domácností","Počet obyvatel","Seznam památek","Strana silničního provozu","Síťové napětí","Užívaný jazyk","Vlajka","Vrcholný orgán soudní moci","Věková hranice pro uzavření manželství","Zeměpisné souřadnice","Úřední jazyk","Člen (čeho)"],
        "Tvar": [],
        "Ulice": ["Délka","Nachází se v administrativní jednotce","Stát"],
        "Uživatel budovy": [],
        "Zeměpisné souřadnice": [],
        "Zhotovitel": ["Jméno na Twitteru","Logo","Motto","Oblast působnosti","Oficiální web","Počet odběratelů na sociálních sítích","Počet zaměstnanců","Předseda","Sídlo","Telefonní číslo","Vlastník","Zakladatel"],
        "Gini koeficient": [],
        "ID relace OpenStreetMap": [],
        "Diplomatický vztah": ["Do"],
        "Dluh ústřední vlády jako procento HDP": [],
        "Doména nejvyššího řádu": [],
        "Erb": ["ISO 15924 číslo","Datum vytvoření / založení"],
        "Forma vlády": [],
        "Hlava státu": ["ID na Facebooku","Akademický titul","Bydliště","Choť","Datum narození","Datum úmrtí","Držitel úřadu","Dítě","E-mail","Hmotnost","Jméno na Instagramu","Jméno na Twitteru","Jméno v kaně","Jméno v rodném jazyce","Krevní skupina","Matka","Místo narození","Místo působení","Nominace na","Národnost","Obrázek","Ocenění","Oficiální blog","Oficiální web","Otec","Ovládané jazyky","Pohlaví","Používaná ruka","Povolání","Počet dětí","Pseudonym","Přezdívka","Příbuzný","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Výška","Zaměření","Člen (čeho)","Škola"],
        "Hlavní město": ["Datum vytvoření / založení","Je vybaveno (čím)","Mapa polohy","Místní telefonní předvolba","Na vodním toku či ploše nebo u ní","Nachází se v administrativní jednotce","Nadmořská výška","Nižší správní celky","Obrázek","Obrázek erbu","Obrázek vlajky","Partnerské město","Plná poštovní adresa","Plošná výměra","Počet obyvatel","Stát","Zeměpisné souřadnice"],
        "Hraničí s": [],
        "Hymna": ["Autor","Autor textu","Datum vytvoření / založení","Doba trvání","Hudební motiv","Hudební úryvek nebo citace","Jazyk díla/jména","Modifikovaná verze (čeho)","Má melodii","Místo děje","Odvozené dílo","Označení tempa","Producent","Skladatel","Stav autorských práv","Tónina","Užívá text","Údery za minutu","Žánr"],
        "Identifikátor GeoNames": [],
        "Index lidského rozvoje": [],
        "Kontinent": ["Geografický tvar","Kód M.49","Plošná výměra","Zeměpisné souřadnice"],
        "Kód země (ISO 3166-1 numeric)": [],
        "Kód země podle Mezinárodního olympijského výboru": [],
        "Mapa polohy": ["Měřítko","Tvůrce"],
        "Maritime identification digits": [],
        "Mezinárodní telefonní předvolba": [],
        "Měna": ["Popis znaku měny"],
        "Nahrávka výslovnosti": [],
        "Nejjižnější bod": [],
        "Nejnižší bod": [],
        "Nejsevernější bod": [],
        "Nejvyšší bod": [],
        "Nejvýchodnější bod": [],
        "Nejzápadnější bod": [],
        "Nižší správní celky": ["Míra nezaměstnanosti","Na území současného administrativního celku","Nachází se v administrativní jednotce","Nejjižnější bod","Nejsevernější bod","Nejvýchodnější bod","Nejzápadnější bod","Nižší správní celky","Oficiální název","Oficiální symbol","Plošná výměra","Zeměpisné souřadnice"],
        "Obrázek erbu": [],
        "Obrázek vlajky": [],
        "Oficiální web": ["URL","Datum vytvoření / založení","Správce","Vlastník"],
        "Plošná výměra": ["Značka veličiny"],
        "Pojmenováno po": ["Oficiální název","Oficiální web","Stát"],
        "Počet obyvatel": [],
        "Představitel": ["Akademický titul","Bydliště","Choť","Datum narození","Datum úmrtí","Držitel úřadu","Dítě","E-mail","Hmotnost","Jméno na Instagramu","Jméno na Twitteru","Jméno v kaně","Jméno v rodném jazyce","Krevní skupina","Matka","Místo narození","Místo působení","Nominace na","Národnost","Obrázek","Ocenění","Oficiální blog","Oficiální web","Organizace řízená z této funkce","Otec","Ovládané jazyky","Pohlaví","Používaná ruka","Povolání","Počet dětí","Pseudonym","Přezdívka","Příbuzný","Sourozenec","Stranická příslušnost","Státní občanství","Ve funkci","Vyznání","Výška","Zaměření","Člen (čeho)","Škola"],
        "Strana silničního provozu": [],
        "Užívaný jazyk": ["Gramatická osoba","Mapa rozšíření","Má gramatický rod","Používá gramatický pád","Používá slovesný způsob","Regulátor jazyka","Stát"],
        "Vlajka": ["Identifikátor Flags of the World"],
        "Vrcholný orgán soudní moci": ["Datum vytvoření / založení"],
        "Úřední jazyk": ["Gramatická osoba","Mapa rozšíření","Má gramatický rod","Používá gramatický pád","Používá slovesný způsob","Používá velká písmena pro","Počet mluvčích","Regulátor jazyka","Stát"],
        "Časové pásmo": ["ICS kód","Posun oproti UTC"]
    };

    const queryVariableInfo = {
        "Člověk": {id:"wd:Q5"},
        "Budova": {id:"wd:Q41176"},
        "Státní útvar": {id:"wd:Q6256"},
        "Jméno": {id:"rdfs:label", valueType:"string"},
        "Název": {id:"rdfs:label", valueType:"string"},
        "Bydliště": {id:"wdt:P551", valueType:"string"},
        "Choť": {id:"wdt:P26", valueType:"string"},
        "Datum křtu": {id:"wdt:P1636", valueType:"date"},
        "Datum narození": {id:"wdt:P569", valueType:"date"},
        "Datum pohřbu nebo kremace": {id:"wdt:P4602", valueType:"date"},
        "Datum úmrtí": {id:"wdt:P570", valueType:"date"},
        "Dílo": {id:"wdt:P800", valueType:"string"},
        "Dítě": {id:"wdt:P40", valueType:"string"},
        "Hmotnost": {id:"wdt:P2067", valueType:"number"},
        "Jméno při narození": {id:"wdt:P1477", valueType:"string"},
        "Jméno v rodném jazyce": {id:"wdt:P1559", valueType:"string"},
        "Matka": {id:"wdt:P25", valueType:"string"},
        "Místo narození": {id:"wdt:P19", valueType:"string"},
        "Místo působení": {id:"wdt:P937", valueType:"string"},
        "Místo úmrtí": {id:"wdt:P20", valueType:"string"},
        "Národnost": {id:"wdt:P172", valueType:"string"},
        "Období působení": {id:"wdt:P1317", valueType:"date"},
        "Obrázek": {id:"wdt:P18", valueType:"image"},
        "Otec": {id:"wdt:P22", valueType:"string"},
        "Ovlivněn (kým)": {id:"wdt:P737", valueType:"string"},
        "Ovládané jazyky": {id:"wdt:P1412", valueType:"string"},
        "Pohlaví": {id:"wdt:P21", valueType:"string"},
        "Povolání": {id:"wdt:P106", valueType:"string"},
        "Pseudonym": {id:"wdt:P742", valueType:"string"},
        "Přezdívka": {id:"wdt:P1449", valueType:"string"},
        "Příjmení": {id:"wdt:P734", valueType:"string"},
        "Příčina smrti": {id:"wdt:P509", valueType:"string"},
        "Rodné jméno": {id:"wdt:P735", valueType:"string"},
        "Sourozenec": {id:"wdt:P3373", valueType:"string"},
        "Stranická příslušnost": {id:"wdt:P102", valueType:"string"},
        "Státní občanství": {id:"wdt:P27", valueType:"string"},
        "Ve funkci": {id:"wdt:P39", valueType:"string"},
        "Vyznání": {id:"wdt:P140", valueType:"string"},
        "Významná osoba": {id:"wdt:P3342", valueType:"string"},
        "Výška": {id:"wdt:P2048", valueType:"number"},
        "Zaměstnavatel": {id:"wdt:P108", valueType:"string"},
        "Zaměření": {id:"wdt:P101", valueType:"string"},
        "Zdravotní postižení": {id:"wdt:P1050", valueType:"string"},
        "Zkráceně": {id:"wdt:P1813", valueType:"string"},
        "Způsob smrti": {id:"wdt:P1196", valueType:"string"},
        "Člen (čeho)": {id:"wdt:P463", valueType:"string"},
        "Škola": {id:"wdt:P69", valueType:"string"},
        "Životní partner": {id:"wdt:P451", valueType:"string"},
        "Architekt": {id:"wdt:P84", valueType:"string"},
        "Architektonický styl": {id:"wdt:P149", valueType:"string"},
        "Barva": {id:"wdt:P462", valueType:"string"},
        "Do": {id:"wdt:P582", valueType:"date"},
        "Kategorie na Commons": {id:"wdt:P373", valueType:"string"},
        "Kód Emporis": {id:"wdt:P455", valueType:"number"},
        "Kód Structurae": {id:"wdt:P454", valueType:"number"},
        "Nachází se v administrativní jednotce": {id:"wdt:P131", valueType:"string"},
        "Nadzemní podlaží": {id:"wdt:P1101", valueType:"number"},
        "Nemá část": {id:"wdt:P3113", valueType:"string"},
        "Oficiální web": {id:"wdt:P856", valueType:"link"},
        "Plná poštovní adresa": {id:"wdt:P6375", valueType:"string"},
        "Podzemní podlaží": {id:"wdt:P1139", valueType:"number"},
        "Použitý materiál": {id:"wdt:P186", valueType:"string"},
        "Poštovní směrovací číslo": {id:"wdt:P281", valueType:"number"},
        "Skládá se z": {id:"wdt:P527", valueType:"string"},
        "Stav užívání": {id:"wdt:P5817", valueType:"string"},
        "Stát": {id:"wdt:P17", valueType:"string"},
        "Tvar": {id:"wdt:P1419", valueType:"string"},
        "Ulice": {id:"wdt:P669", valueType:"string"},
        "Uživatel budovy": {id:"wdt:P466", valueType:"string"},
        "Zeměpisné souřadnice": {id:"wdt:P625", valueType:"coordinates"},
        "Zhotovitel": {id:"wdt:P193", valueType:"string"},
        "Gini koeficient": {id:"wdt:P1125", valueType:"number"},
        "ID relace OpenStreetMap": {id:"wdt:P402", valueType:"number"},
        "Diplomatický vztah": {id:"wdt:P530", valueType:"string"},
        "Dluh ústřední vlády jako procento HDP": {id:"wdt:P1689", valueType:"number"},
        "Doména nejvyššího řádu": {id:"wdt:P78", valueType:"string"},
        "Erb": {id:"wdt:P237", valueType:"string"},
        "Forma vlády": {id:"wdt:P122", valueType:"string"},
        "Galerie na Commons": {id:"wdt:P935", valueType:"string"},
        "Hlava státu": {id:"wdt:P35", valueType:"string"},
        "Hlavní město": {id:"wdt:P36", valueType:"string"},
        "Hraničí s": {id:"wdt:P47", valueType:"string"},
        "Hymna": {id:"wdt:P85", valueType:"string"},
        "Identifikátor GeoNames": {id:"wdt:P1566", valueType:"number"},
        "Index lidského rozvoje": {id:"wdt:P1081", valueType:"number"},
        "Kategorie lidí spojených s tímto místem": {id:"wdt:P1792", valueType:"string"},
        "Kategorie lidí zde narozených": {id:"wdt:P1464", valueType:"string"},
        "Kategorie lidí zde pohřbených": {id:"wdt:P1791", valueType:"string"},
        "Kategorie lidí zde zemřelých": {id:"wdt:P1465", valueType:"string"},
        "Kontinent": {id:"wdt:P30", valueType:"string"},
        "Kód FIPS 10-4": {id:"wdt:P901", valueType:"string"},
        "Kód země (ISO 3166-1 alpha-2)": {id:"wdt:P297", valueType:"string"},
        "Kód země (ISO 3166-1 alpha-3)": {id:"wdt:P298", valueType:"string"},
        "Kód země (ISO 3166-1 numeric)": {id:"wdt:P299", valueType:"number"},
        "Kód země podle GS1": {id:"wdt:P3067", valueType:"number"},
        "Kód země podle Mezinárodního olympijského výboru": {id:"wdt:P984", valueType:"string"},
        "Mapa polohy": {id:"wdt:P242", valueType:"image"},
        "Maritime identification digits": {id:"wdt:P2979", valueType:"number"},
        "Mezinárodní telefonní předvolba": {id:"wdt:P474", valueType:"number"},
        "Měna": {id:"wdt:P38", valueType:"string"},
        "Nahrávka výslovnosti": {id:"wdt:P443", valueType:"link"},
        "Nejjižnější bod": {id:"wdt:P1333", valueType:"coordinates"},
        "Nejnižší bod": {id:"wdt:P1589", valueType:"string"},
        "Nejsevernější bod": {id:"wdt:P1332", valueType:"coordinates"},
        "Nejvyšší bod": {id:"wdt:P610", valueType:"string"},
        "Nejvýchodnější bod": {id:"wdt:P1334", valueType:"coordinates"},
        "Nejzápadnější bod": {id:"wdt:P1335", valueType:"coordinates"},
        "Nižší správní celky": {id:"wdt:P150", valueType:"string"},
        "Obrázek erbu": {id:"wdt:P94", valueType:"image"},
        "Obrázek vlajky": {id:"wdt:P41", valueType:"image"},
        "Plošná výměra": {id:"wdt:P2046", valueType:"number"},
        "Pojmenováno po": {id:"wdt:P138", valueType:"string"},
        "Počet obyvatel": {id:"wdt:P1082", valueType:"number"},
        "Představitel": {id:"wdt:P6", valueType:"string"},
        "Strana silničního provozu": {id:"wdt:P1622", valueType:"string"},
        "Užívaný jazyk": {id:"wdt:P2936", valueType:"string"},
        "Vlajka": {id:"wdt:P163", valueType:"string"},
        "Vrcholný orgán soudní moci": {id:"wdt:P209", valueType:"string"},
        "Úřední jazyk": {id:"wdt:P37", valueType:"string"},
        "Časové pásmo": {id:"wdt:P421", valueType:"string"},
        "NDL JPNO": {id:"wdt:P2687", valueType:"number"},
        "OSGR": {id:"wdt:P613", valueType:"string"},
        "Autor": {id:"wdt:P50", valueType:"string"},
        "Celé dílo dostupné na": {id:"wdt:P953", valueType:"link"},
        "Digitální soubor na Commons": {id:"wdt:P996", valueType:"link"},
        "Distribuce": {id:"wdt:P437", valueType:"string"},
        "Délka": {id:"wdt:P2043", valueType:"number"},
        "Editor": {id:"wdt:P98", valueType:"string"},
        "Fyzicky interaguje s": {id:"wdt:P129", valueType:"string"},
        "Geografický tvar": {id:"wdt:P3896", valueType:"link"},
        "Hlavní téma díla": {id:"wdt:P921", valueType:"string"},
        "Identifikátor GNS Unique Feature": {id:"wdt:P2326", valueType:"number"},
        "Incipit": {id:"wdt:P1922", valueType:"string"},
        "Jazyk díla/jména": {id:"wdt:P407", valueType:"string"},
        "Kód M.49": {id:"wdt:P2082", valueType:"number"},
        "Licence": {id:"wdt:P275", valueType:"string"},
        "Moderátor": {id:"wdt:P371", valueType:"string"},
        "Místo": {id:"wdt:P276", valueType:"string"},
        "Nová funkce": {id:"wdt:P751", valueType:"string"},
        "Nástrojové obsazení": {id:"wdt:P870", valueType:"string"},
        "Objednavatel": {id:"wdt:P88", valueType:"string"},
        "Objem": {id:"wdt:P2234", valueType:"number"},
        "Podtitul": {id:"wdt:P1680", valueType:"string"},
        "Postavy": {id:"wdt:P674", valueType:"string"},
        "Použití": {id:"wdt:P366", valueType:"string"},
        "Počet částí uměleckého díla": {id:"wdt:P2635", valueType:"number"},
        "Pracovní název": {id:"wdt:P1638", valueType:"string"},
        "Premiérové vysílání": {id:"wdt:P449", valueType:"string"},
        "Produkční společnost": {id:"wdt:P272", valueType:"string"},
        "Titul": {id:"wdt:P1476", valueType:"string"},
        "Zamýšlená cílová skupina": {id:"wdt:P2360", valueType:"string"},
        "Šířka": {id:"wdt:P2049", valueType:"number"},
        "Žánr": {id:"wdt:P136", valueType:"string"},
        "Datum": {id:"wdt:P585", valueType:"date"},
        "Den v týdnu": {id:"wdt:P2894", valueType:"string"},
        "Doba trvání": {id:"wdt:P2047", valueType:"number"},
        "Datum vytvoření / založení": {id:"wdt:P571", valueType:"date"},
        "Inventární číslo": {id:"wdt:P217", valueType:"string"},
        "Místo vzniku": {id:"wdt:P740", valueType:"string"},
        "Ocenění": {id:"wdt:P166", valueType:"string"},
        "Podle": {id:"wdt:P144", valueType:"string"},
        "Sbírka": {id:"wdt:P195", valueType:"string"},
        "Sponzor": {id:"wdt:P859", valueType:"string"},
        "Tvůrce": {id:"wdt:P170", valueType:"string"},
        "Uhlíková stopa": {id:"wdt:P5991", valueType:"number"},
        "Video soubor": {id:"wdt:P10", valueType:"image"},
        "Dimenze v ISQ": {id:"wdt:P4020", valueType:"string"},
        "Značka veličiny": {id:"wdt:P416", valueType:"string"},
        "Caverphone": {id:"wdt:P3880", valueType:"string"},
        "Soundex": {id:"wdt:P3878", valueType:"string"},
        "Kolínská fonetika": {id:"wdt:P3879", valueType:"number"},
        "Písmo": {id:"wdt:P282", valueType:"string"},
        "V původním jazyce": {id:"wdt:P1705", valueType:"string"},
        "Údajně totéž co": {id:"wdt:P460", valueType:"string"},
        "Počet nemocničních lůžek": {id:"wdt:P6801", valueType:"number"},
        "Počet zaměstnanců": {id:"wdt:P1128", valueType:"number"},
        "Provozovatel": {id:"wdt:P137", valueType:"string"},
        "Urgentní příjem": {id:"wdt:P6855", valueType:"string"},
        "Vlastník": {id:"wdt:P127", valueType:"string"},
        "Nadmořská výška": {id:"wdt:P2044", valueType:"number"},
        "Související riziko": {id:"wdt:P3335", valueType:"string"},
        "Mapa rozšíření": {id:"wdt:P1846", valueType:"image"},
        "Umělecký směr": {id:"wdt:P135", valueType:"string"},
        "Tloušťka": {id:"wdt:P2610", valueType:"number"},
        "Výrobní metoda": {id:"wdt:P2079", valueType:"string"},
        "Zobrazuje": {id:"wdt:P180", valueType:"string"},
        "Mužská varianta štítku": {id:"wdt:P3321", valueType:"string"},
        "Obor tohoto povolání": {id:"wdt:P425", valueType:"string"},
        "Praktikováno (kým)": {id:"wdt:P3095", valueType:"string"},
        "Ženská varianta štítku": {id:"wdt:P2521", valueType:"string"},
        "Identické příjmení": {id:"wdt:P1533", valueType:"string"},
        "Jmeniny": {id:"wdt:P1750", valueType:"string"},
        "Patronymum nebo matronymum": {id:"wdt:P2976", valueType:"string"},
        "Rodné jméno druhého pohlaví": {id:"wdt:P1560", valueType:"string"},
        "ID institutu na ResearchGate": {id:"wdt:P2740", valueType:"string"},
        "ISNI": {id:"wdt:P213", valueType:"string"},
        "LEI": {id:"wdt:P1278", valueType:"string"},
        "OpenCorporates ID": {id:"wdt:P1320", valueType:"string"},
        "Datum zániku": {id:"wdt:P576", valueType:"date"},
        "Držitel úřadu": {id:"wdt:P1308", valueType:"string"},
        "Fax": {id:"wdt:P2900", valueType:"number"},
        "Generální ředitel": {id:"wdt:P169", valueType:"string"},
        "Identifikační číslo zaměstnavatele podle IRS": {id:"wdt:P1297", valueType:"number"},
        "Logo": {id:"wdt:P154", valueType:"image"},
        "Mateřská organizace": {id:"wdt:P749", valueType:"string"},
        "Motto": {id:"wdt:P1451", valueType:"string"},
        "Místo pohřbení": {id:"wdt:P119", valueType:"string"},
        "Oblast působnosti": {id:"wdt:P2541", valueType:"string"},
        "Odvětví": {id:"wdt:P452", valueType:"string"},
        "Organizace řízená z této funkce": {id:"wdt:P2389", valueType:"string"},
        "Politické směřování": {id:"wdt:P1387", valueType:"string"},
        "Počet mandátů v legislativním orgánu": {id:"wdt:P1410", valueType:"number"},
        "Počet členů": {id:"wdt:P2124", valueType:"number"},
        "Prefix DOI": {id:"wdt:P1662", valueType:"number"},
        "Produkuje": {id:"wdt:P1056", valueType:"string"},
        "Provozní ředitel": {id:"wdt:P1789", valueType:"string"},
        "Právní forma": {id:"wdt:P1454", valueType:"string"},
        "Předseda": {id:"wdt:P488", valueType:"string"},
        "Sídlo": {id:"wdt:P159", valueType:"string"},
        "Telefonní číslo": {id:"wdt:P1329", valueType:"number"},
        "Zakladatel": {id:"wdt:P112", valueType:"string"},
        "Autor předmluvy": {id:"wdt:P2679", valueType:"string"},
        "Počet": {id:"wdt:P1114", valueType:"number"},
        "Počet stran": {id:"wdt:P1104", valueType:"number"},
        "Zahrnuje": {id:"wdt:P2670", valueType:"string"},
        "Datum objevu": {id:"wdt:P575", valueType:"date"},
        "Objevitel nebo vynálezce": {id:"wdt:P61", valueType:"string"},
        "EMedicine": {id:"wdt:P673", valueType:"number"},
        "Kód DiseasesDB": {id:"wdt:P557", valueType:"number"},
        "Kód MKN-10": {id:"wdt:P494", valueType:"string"},
        "Kód MKN-9": {id:"wdt:P493", valueType:"number"},
        "Příznaky": {id:"wdt:P780", valueType:"string"},
        "Zasahuje": {id:"wdt:P689", valueType:"string"},
        "ISO 15924 alpha-4 kód": {id:"wdt:P506", valueType:"string"},
        "ISO 15924 číslo": {id:"wdt:P2620", valueType:"number"},
        "Směr psaní": {id:"wdt:P1406", valueType:"string"},
        "Hudební nástroj": {id:"wdt:P1303", valueType:"string"},
        "Počet studentů": {id:"wdt:P2196", valueType:"number"},
        "ID kanálu YouTube": {id:"wdt:P2397", valueType:"string"},
        "ID na Facebooku": {id:"wdt:P2013", valueType:"string"},
        "ID společnosti na LinkedIn": {id:"wdt:P4264", valueType:"number"},
        "URL informací o stavu služby": {id:"wdt:P9138", valueType:"link"},
        "WorldCat Identities ID": {id:"wdt:P7859", valueType:"string"},
        "Aktiva": {id:"wdt:P2403", valueType:"number"},
        "Burza": {id:"wdt:P414", valueType:"string"},
        "Cizí zdroje": {id:"wdt:P2138", valueType:"number"},
        "Dceřiná společnost": {id:"wdt:P355", valueType:"string"},
        "Identifikátor EUTA pro osobu": {id:"wdt:P4534", valueType:"number"},
        "Jméno na Twitteru": {id:"wdt:P2002", valueType:"string"},
        "Obchodní divize": {id:"wdt:P199", valueType:"string"},
        "Oficiální název": {id:"wdt:P1448", valueType:"string"},
        "Popsáno v URL": {id:"wdt:P973", valueType:"link"},
        "Počet odběratelů na sociálních sítích": {id:"wdt:P8687", valueType:"number"},
        "Provozní zisk": {id:"wdt:P3362", valueType:"number"},
        "Tržby": {id:"wdt:P2139", valueType:"number"},
        "Tržní kapitalizace": {id:"wdt:P2226", valueType:"number"},
        "Vlastní kapitál": {id:"wdt:P2137", valueType:"number"},
        "Země původu": {id:"wdt:P495", valueType:"string"},
        "Čistý zisk": {id:"wdt:P2295", valueType:"number"},
        "Člen správní rady": {id:"wdt:P3320", valueType:"string"},
        "Ekvivalentní Wikidata SPARQL dotaz": {id:"wdt:P3921", valueType:"string"},
        "Kategorie kombinuje témata": {id:"wdt:P971", valueType:"string"},
        "Kategorie obsahuje": {id:"wdt:P4224", valueType:"string"},
        "Seznam (čeho)": {id:"wdt:P360", valueType:"string"},
        "Téma kategorie": {id:"wdt:P301", valueType:"string"},
        "Facebook Places ID": {id:"wdt:P1997", valueType:"number"},
        "TGN ID": {id:"wdt:P1667", valueType:"number"},
        "WOEID": {id:"wdt:P1281", valueType:"number"},
        "Kód GNIS": {id:"wdt:P590", valueType:"number"},
        "Kód čínské administrativní jednotky": {id:"wdt:P442", valueType:"number"},
        "Míra nezaměstnanosti": {id:"wdt:P1198", valueType:"number"},
        "Na území současného administrativního celku": {id:"wdt:P3842", valueType:"string"},
        "Nástupce": {id:"wdt:P1366", valueType:"string"},
        "Oficiální symbol": {id:"wdt:P2238", valueType:"string"},
        "Poznávací značka": {id:"wdt:P395", valueType:"string"},
        "Počet domácností": {id:"wdt:P1538", valueType:"number"},
        "Předchůdce": {id:"wdt:P1365", valueType:"string"},
        "Seznam památek": {id:"wdt:P1456", valueType:"string"},
        "Síťové napětí": {id:"wdt:P2884", valueType:"number"},
        "Věková hranice pro uzavření manželství": {id:"wdt:P3000", valueType:"number"},
        "Alexa rank": {id:"wdt:P1661", valueType:"number"},
        "URL": {id:"wdt:P2699", valueType:"link"},
        "Autor (text)": {id:"wdt:P2093", valueType:"string"},
        "Cituje": {id:"wdt:P2860", valueType:"string"},
        "Datum vydání": {id:"wdt:P577", valueType:"date"},
        "Správce": {id:"wdt:P126", valueType:"string"},
        "Vydavatel": {id:"wdt:P123", valueType:"string"},
        "Cíl cesty": {id:"wdt:P1444", valueType:"string"},
        "Dopravní síť": {id:"wdt:P16", valueType:"string"},
        "Počátek cesty": {id:"wdt:P1427", valueType:"string"},
        "Charakterizováno (čím)": {id:"wdt:P1552", valueType:"string"},
        "Emisivita": {id:"wdt:P1295", valueType:"number"},
        "Kód německého okresu": {id:"wdt:P440", valueType:"number"},
        "Úřad vedoucího této organizace": {id:"wdt:P2388", valueType:"string"},
        "Identifikátor Freebase": {id:"wdt:P646", valueType:"string"},
        "Účastník": {id:"wdt:P710", valueType:"string"},
        "Část (čeho)": {id:"wdt:P361", valueType:"string"},
        "Patří k jurisdikci": {id:"wdt:P1001", valueType:"string"},
        "Akademický titul": {id:"wdt:P512", valueType:"string"},
        "E-mail": {id:"wdt:P968", valueType:"string"},
        "Jméno na Instagramu": {id:"wdt:P2003", valueType:"string"},
        "Jméno v kaně": {id:"wdt:P1814", valueType:"string"},
        "Krevní skupina": {id:"wdt:P1853", valueType:"number"},
        "Nominace na": {id:"wdt:P1411", valueType:"string"},
        "Oficiální blog": {id:"wdt:P1581", valueType:"link"},
        "Používaná ruka": {id:"wdt:P552", valueType:"string"},
        "Počet dětí": {id:"wdt:P1971", valueType:"number"},
        "Příbuzný": {id:"wdt:P1038", valueType:"string"},
        "BNF ID": {id:"wdt:P268", valueType:"string"},
        "Banner pro Wikicesty": {id:"wdt:P948", valueType:"image"},
        "Hlavní kategorie tématu": {id:"wdt:P910", valueType:"string"},
        "Identifikátor GND": {id:"wdt:P227", valueType:"number"},
        "Je vybaveno (čím)": {id:"wdt:P912", valueType:"string"},
        "Kód MusicBrainz pro oblast": {id:"wdt:P982", valueType:"string"},
        "Místní telefonní předvolba": {id:"wdt:P473", valueType:"number"},
        "Na vodním toku či ploše nebo u ní": {id:"wdt:P206", valueType:"string"},
        "Otevírací doba": {id:"wdt:P3025", valueType:"string"},
        "Partnerské město": {id:"wdt:P190", valueType:"string"},
        "Parsonův kód": {id:"wdt:P1236", valueType:"string"},
        "VIAF": {id:"wdt:P214", valueType:"number"},
        "Autor textu": {id:"wdt:P676", valueType:"string"},
        "Druh uměleckého díla": {id:"wdt:P7937", valueType:"string"},
        "Explicit": {id:"wdt:P3132", valueType:"string"},
        "Hudební motiv": {id:"wdt:P6686", valueType:"string"},
        "Hudební úryvek nebo citace": {id:"wdt:P6670", valueType:"string"},
        "Identifikátor NLI (Izrael)": {id:"wdt:P949", valueType:"number"},
        "Interpret": {id:"wdt:P175", valueType:"string"},
        "Kód MusicBrainz pro dílo": {id:"wdt:P435", valueType:"string"},
        "Modifikováno (kým)": {id:"wdt:P5202", valueType:"string"},
        "Má melodii": {id:"wdt:P1625", valueType:"string"},
        "Místo děje": {id:"wdt:P840", valueType:"string"},
        "Odehrává se v období": {id:"wdt:P2408", valueType:"number"},
        "Odvozené dílo": {id:"wdt:P4969", valueType:"string"},
        "Označení tempa": {id:"wdt:P1558", valueType:"string"},
        "Partitura": {id:"wdt:P3030", valueType:"image"},
        "Producent": {id:"wdt:P162", valueType:"string"},
        "Skladatel": {id:"wdt:P86", valueType:"string"},
        "Stav autorských práv": {id:"wdt:P6216", valueType:"string"},
        "Takt": {id:"wdt:P3440", valueType:"string"},
        "Tónina": {id:"wdt:P826", valueType:"string"},
        "Užívá text": {id:"wdt:P6439", valueType:"string"},
        "Údery za minutu": {id:"wdt:P1725", valueType:"number"},
        "Číslo IMSLP": {id:"wdt:P839", valueType:"string"},
        "Měřítko": {id:"wdt:P1752", valueType:"number"},
        "ISO 4217": {id:"wdt:P498", valueType:"string"},
        "Fyzikální veličina": {id:"wdt:P111", valueType:"string"},
        "Popis znaku měny": {id:"wdt:P489", valueType:"string"},
        "Převod na jednotku SI": {id:"wdt:P2370", valueType:"number"},
        "Převod na standardní jednotku": {id:"wdt:P2442", valueType:"number"},
        "Značka jednotky": {id:"wdt:P5061", valueType:"string"},
        "Identifikátor Flags of the World": {id:"wdt:P3089", valueType:"string"},
        "Gramatická osoba": {id:"wdt:P5110", valueType:"string"},
        "Má gramatický rod": {id:"wdt:P5109", valueType:"string"},
        "Používá gramatický pád": {id:"wdt:P2989", valueType:"string"},
        "Používá slovesný způsob": {id:"wdt:P3161", valueType:"string"},
        "Regulátor jazyka": {id:"wdt:P1018", valueType:"string"},
        "Uzákoněno": {id:"wdt:P92", valueType:"string"},
        "ISO 639-1": {id:"wdt:P218", valueType:"string"},
        "ISO 639-3": {id:"wdt:P220", valueType:"string"},
        "Kód jazyka pro Wikimedia": {id:"wdt:P424", valueType:"string"},
        "Používá velká písmena pro": {id:"wdt:P6106", valueType:"string"},
        "Počet mluvčích": {id:"wdt:P1098", valueType:"number"},
        "ICS kód": {id:"wdt:P5046", valueType:"number"},
        "Posun oproti UTC": {id:"wdt:P2907", valueType:"number"},
        "Správce standardu": {id:"wdt:P1462", valueType:"string"}
    };

    class GlobalVariables {
        constructor() { }
        static get queryItemVariables() {
            return Object.keys(queryVariableInfo).filter(x => queryVariableInfo[x].id.slice(0, 4) == "wd:Q");
        }
    }
    GlobalVariables.queryEntityProperties = queryEntityProperties;
    GlobalVariables.queryEntityInfo = queryVariableInfo;

    class SPARQLQueryDispatcher {
        constructor(endpoint) {
            this.endpoint = endpoint;
        }
        async query(sparqlQuery, queryID) {
            const fullUrl = this.endpoint + '?query=' + encodeURIComponent(sparqlQuery);
            const headers = { 'Accept': 'application/sparql-results+json' };
            let output = {
                //returns some sort of way to identify each query sent
                queryID: queryID,
                //Returns either a json of the data, Timeout in case of a timeout, or an error in case of a query error
                //I am not sure how to differentiate between a normal object and an error object
                //So there is currently no way to process a direct error, apart from letting it catch in the promise itself
                data: await fetch(fullUrl, { headers }).then(body => body.status == 500 ? "Timeout" : body.json())
                    .catch(err => { console.log("Error from QueryDispatcher", err); return err; })
            };
            return output;
        }
    }

    /* src\components\queryBuilder\SearchInput.svelte generated by Svelte v3.48.0 */

    const { console: console_1$2 } = globals;
    const file$5 = "src\\components\\queryBuilder\\SearchInput.svelte";

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (374:8) {:else}
    function create_else_block$4(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*examples*/ ctx[1]?.length == 0) return create_if_block_2$3;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(374:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (367:8) {#if LoadingExamples}
    function create_if_block$4(ctx) {
    	let option;
    	let if_block_anchor;
    	let if_block = /*examples*/ ctx[1] && create_if_block_1$4(ctx);

    	const block = {
    		c: function create() {
    			option = element("option");
    			option.textContent = "Načítají se další možnosti...";
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			option.__value = "";
    			option.value = option.__value;
    			option.disabled = true;
    			attr_dev(option, "class", "svelte-kcrvy0");
    			add_location(option, file$5, 367, 12, 19343);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*examples*/ ctx[1]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_1$4(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(367:8) {#if LoadingExamples}",
    		ctx
    	});

    	return block;
    }

    // (379:12) {:else}
    function create_else_block_1$1(ctx) {
    	let each_1_anchor;
    	let each_value_1 = /*examples*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*examples*/ 2) {
    				each_value_1 = /*examples*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(379:12) {:else}",
    		ctx
    	});

    	return block;
    }

    // (376:12) {#if examples?.length == 0}
    function create_if_block_2$3(ctx) {
    	let option0;
    	let option1;

    	const block = {
    		c: function create() {
    			option0 = element("option");
    			option0.textContent = "Nastala chyba při hledání možností";
    			option1 = element("option");
    			option1.textContent = "Stále můžete zadat hodnoty, které hledáte";
    			option0.__value = "";
    			option0.value = option0.__value;
    			option0.disabled = true;
    			attr_dev(option0, "class", "svelte-kcrvy0");
    			add_location(option0, file$5, 376, 16, 19728);
    			option1.__value = "";
    			option1.value = option1.__value;
    			option1.disabled = true;
    			attr_dev(option1, "class", "svelte-kcrvy0");
    			add_location(option1, file$5, 377, 16, 19815);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option0, anchor);
    			insert_dev(target, option1, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option0);
    			if (detaching) detach_dev(option1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(376:12) {#if examples?.length == 0}",
    		ctx
    	});

    	return block;
    }

    // (380:16) {#each examples as example}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*example*/ ctx[11] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*example*/ ctx[11];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-kcrvy0");
    			add_location(option, file$5, 380, 20, 19979);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*examples*/ 2 && t_value !== (t_value = /*example*/ ctx[11] + "")) set_data_dev(t, t_value);

    			if (dirty & /*examples*/ 2 && option_value_value !== (option_value_value = /*example*/ ctx[11])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(380:16) {#each examples as example}",
    		ctx
    	});

    	return block;
    }

    // (369:12) {#if examples}
    function create_if_block_1$4(ctx) {
    	let each_1_anchor;
    	let each_value = /*examples*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*examples*/ 2) {
    				each_value = /*examples*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(369:12) {#if examples}",
    		ctx
    	});

    	return block;
    }

    // (370:16) {#each examples as example}
    function create_each_block$2(ctx) {
    	let option;
    	let t_value = /*example*/ ctx[11] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*example*/ ctx[11];
    			option.value = option.__value;
    			attr_dev(option, "class", "svelte-kcrvy0");
    			add_location(option, file$5, 370, 20, 19504);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*examples*/ 2 && t_value !== (t_value = /*example*/ ctx[11] + "")) set_data_dev(t, t_value);

    			if (dirty & /*examples*/ 2 && option_value_value !== (option_value_value = /*example*/ ctx[11])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(370:16) {#each examples as example}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div0;
    	let t0;
    	let div1;
    	let input;
    	let input_id_value;
    	let input_value_value;
    	let t1;
    	let datalist;
    	let datalist_id_value;
    	let t2;
    	let infosign;
    	let div1_id_value;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*LoadingExamples*/ ctx[2]) return create_if_block$4;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	infosign = new InfoSign$1({
    			props: {
    				text: "Můžete zadat vlastní hodnoty, ale není zaručeno, že je v databázi pod stejným názvem"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			div1 = element("div");
    			input = element("input");
    			t1 = space();
    			datalist = element("datalist");
    			if_block.c();
    			t2 = space();
    			create_component(infosign.$$.fragment);
    			set_style(div0, "display", "none");
    			attr_dev(div0, "class", "active svelte-kcrvy0");
    			add_location(div0, file$5, 357, 0, 18740);
    			attr_dev(input, "list", "");
    			attr_dev(input, "id", input_id_value = "stringInput" + /*tripleDetails*/ ctx[0].tripleID);
    			input.value = input_value_value = /*tripleDetails*/ ctx[0].selectedValue;
    			attr_dev(input, "placeholder", "Prázdné pole = Jakákoliv hodnota");
    			attr_dev(input, "class", "svelte-kcrvy0");
    			add_location(input, file$5, 361, 4, 18927);
    			attr_dev(datalist, "id", datalist_id_value = "examplesDatalist" + /*tripleDetails*/ ctx[0].tripleID);
    			attr_dev(datalist, "class", "svelte-kcrvy0");
    			add_location(datalist, file$5, 365, 4, 19241);
    			attr_dev(div1, "id", div1_id_value = "stringInputContainer" + /*tripleDetails*/ ctx[0].tripleID);
    			attr_dev(div1, "class", "svelte-kcrvy0");
    			add_location(div1, file$5, 360, 0, 18865);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input);
    			append_dev(div1, t1);
    			append_dev(div1, datalist);
    			if_block.m(datalist, null);
    			append_dev(div1, t2);
    			mount_component(infosign, div1, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*handleInputChange*/ ctx[3], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*tripleDetails*/ 1 && input_id_value !== (input_id_value = "stringInput" + /*tripleDetails*/ ctx[0].tripleID)) {
    				attr_dev(input, "id", input_id_value);
    			}

    			if (!current || dirty & /*tripleDetails*/ 1 && input_value_value !== (input_value_value = /*tripleDetails*/ ctx[0].selectedValue) && input.value !== input_value_value) {
    				prop_dev(input, "value", input_value_value);
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(datalist, null);
    				}
    			}

    			if (!current || dirty & /*tripleDetails*/ 1 && datalist_id_value !== (datalist_id_value = "examplesDatalist" + /*tripleDetails*/ ctx[0].tripleID)) {
    				attr_dev(datalist, "id", datalist_id_value);
    			}

    			if (!current || dirty & /*tripleDetails*/ 1 && div1_id_value !== (div1_id_value = "stringInputContainer" + /*tripleDetails*/ ctx[0].tripleID)) {
    				attr_dev(div1, "id", div1_id_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div0);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			destroy_component(infosign);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let temp;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SearchInput', slots, []);
    	const dispatch = createEventDispatcher();

    	function handleInputChange(event) {
    		dispatch("InputChange", { inputValue: event.srcElement.value });
    	}

    	let { searchInputValuesOption } = $$props;
    	let { allTriples } = $$props;
    	let { tripleDetails } = $$props;
    	const queryDispatcher = new SPARQLQueryDispatcher('https://query.wikidata.org/sparql');
    	let examples = undefined;
    	let LoadingExamples = true;

    	//Creates a query for example values for the property
    	//And subsequently sets variables to the array of results
    	async function queryExampleValues() {
    		if (!tripleDetails.selectedItem || !tripleDetails.selectedProperty) return;
    		$$invalidate(1, examples = []);
    		$$invalidate(2, LoadingExamples = true);
    		let propertyID = GlobalVariables.queryEntityInfo[tripleDetails.selectedProperty].id;

    		//Creates a different query depending on the option selected
    		switch (searchInputValuesOption) {
    			case 0:
    				//creates and processes 3 queries with increasing limits
    				for (let x = 0; x < 3; x++) {
    					await queryDispatcher.query(`select distinct ?value ?valueLabel\n` + `where {\n` + `{\n` + `    select distinct ?value \n` + `    where {\n` + `    ?subject ${propertyID} ?value.\n` + `    \n` + `    }group by ?value limit ${[100, 500, 2500][x]}\n` + `} \n` + `service wikibase:label { \n` + `    bd:serviceParam wikibase:language "cs". \n` + `    ?value rdfs:label ?valueLabel\n` + `}\n` + `filter (lang(?valueLabel) = "cs")\n` + `}`, propertyID).then(queryJson => {
    						if (queryJson.data == "Timeout") {
    							console.log(`Timeout for fast${["small", "medium", "big"][x]} query for: ${tripleDetails.selectedProperty} (${propertyID})`);
    						} else if (queryJson.queryID == GlobalVariables.queryEntityInfo[tripleDetails.selectedProperty].id) {
    							$$invalidate(1, examples = queryJson.data.results.bindings.map(x => x.valueLabel.value));
    							console.log(`Fast ${["small", "medium", "big"][x]} query for ${tripleDetails.selectedProperty} (${propertyID}) was loaded`);
    						}
    					}).catch(err => {
    						console.log(`Unexpected error for fast ${["small", "medium", "big"][x]} query for: ${tripleDetails.selectedProperty} (${propertyID}):
                        ${err}`);
    					});

    					renewOnclickEvents();
    				}
    				break;
    			case 1:
    				//Put only in this case because it is guaranteed to be slower and possibly rewrite the results when switching to the faster method
    				let currentOption = searchInputValuesOption;
    				let validTriples = [...allTriples].filter(x => x.selectedProperty);
    				let nameLine;
    				let tripleIndex;
    				//A check for a custom property (currently only "Jméno")
    				for (let x = validTriples.length - 1; x > -1; x--) {
    					if (validTriples[x].selectedProperty == "Jméno" || validTriples[x].selectedProperty == "Název") {
    						nameLine = {
    							item: "?0",
    							property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    							value: "",
    							wantedValue: validTriples[x].selectedValue
    						};

    						validTriples.splice(x, 1);
    					}
    				}
    				let queryValidity = validTriples.length != 0;
    				let queryLines = [];
    				let uniqueVariables = new Set();
    				//Formats each triple into equal lines for the query
    				//There are different cases based on the type of value and if there is a wanted value
    				function formatTripleAndFilter(queryLine, lineIndex) {
    					let output = "";

    					switch (GlobalVariables.queryEntityInfo[validTriples[lineIndex].selectedProperty].valueType) {
    						case "string":
    							output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    							if (queryLine.wantedValue != "") output += `${queryLine.value} rdfs:label "${queryLine.wantedValue}"@cs .\n\t`;
    							break;
    						case "date":
    							output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    							if (queryLine.wantedValue != "") {
    								if (validTriples[lineIndex].selectedTimePeriod == "Přesně") {
    									switch (validTriples[lineIndex].selectedTimePrecision) {
    										case "Den":
    											output += `FILTER(DAY(${queryLine.value}) = DAY("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    										case "Měsíc":
    											output += `FILTER(MONTH(${queryLine.value}) =  MONTH("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    										case "Rok":
    											output += `FILTER(YEAR(${queryLine.value}) = YEAR("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    									}
    								} else {
    									let periodIntervalSymbol = ({ "Po": ">", "Před": "<" })[validTriples[lineIndex].selectedTimePeriod];

    									switch (validTriples[lineIndex].selectedTimePrecision) {
    										case "Rok":
    											output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 4)}-01-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    											break;
    										case "Měsíc":
    											output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 7)}-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    											break;
    										case "Den":
    											output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime)\n\t`;
    									}
    								}
    							}
    							break;
    						case "number":
    							output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .`;
    							if (queryLine.wantedValue != "") {
    								let intervalSymbol = ({
    									"Méně nebo rovno": "<=",
    									"Méně než": "<",
    									"Více nebo rovno": ">=",
    									"Více než": ">",
    									"Rovno": "="
    								})[validTriples[lineIndex].selectedNumberInterval];

    								output += `FILTER(${queryLine.value} ${intervalSymbol} ${queryLine.wantedValue})\n\t`;
    							}
    							break;
    						case "link":
    						case "image":
    						case "coordinates":
    							output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    							break;
    					}

    					return output;
    				}
    				//This doesn't have to be put in a function, but is left in one in case the need of updating the query is ever needed multiple times
    				function updateQueryTriples() {
    					if (!queryValidity) ; else {
    						//Gives each component in a triple the correct variable
    						for (let x = 0; x < validTriples.length; x++) {
    							let item = "";

    							//Checks if the item was already given a variable
    							for (let y = 0; y < x; y++) {
    								if (validTriples[x].selectedItem == validTriples[y].selectedItem) {
    									item = queryLines[y].item;
    									break;
    								}
    							}

    							//checks if the property (now an item) was already given a variable
    							if (!item) {
    								for (let y = 0; y < x; y++) {
    									if (validTriples[x].selectedItem == validTriples[y].selectedProperty) {
    										item = queryLines[y].value;
    										break;
    									}
    								}
    							}

    							if (!item) item = `?${x * 2}`;
    							let value = `?${x * 2 + 1}`;
    							if (validTriples[x].tripleID == tripleDetails.tripleID) tripleIndex = x;

    							queryLines.push({
    								item,
    								property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    								value,
    								wantedValue: validTriples[x].selectedValue
    							});
    						}

    						//Adds each variable that was created into an easy Set to iterate through later
    						for (let x of queryLines) {
    							uniqueVariables.add(x.item);
    							if (x.value[0] == "?") uniqueVariables.add(x.value);
    						}
    					}
    				}
    				updateQueryTriples();
    				//Creates 3 queries of increasing limits
    				for (let x = 0; x < 3; x++) {
    					await queryDispatcher.query(
    						`select distinct ?value ?valueLabel\n` + `where {\n` + `    ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .\n` + `    ${(nameLine === null || nameLine === void 0
						? void 0
						: nameLine.wantedValue)
						? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`
						: ""}\n` + `    ${queryLines.map(formatTripleAndFilter).join("")}\n` + `    bind(${queryLines[tripleIndex].value} as ?value)\n` + `    service wikibase:label { \n` + `        bd:serviceParam wikibase:language "cs" .\n` + `        ?value rdfs:label ?valueLabel .\n` + `    }\n` + `    filter(lang(?valueLabel) = "cs")\n` + `} limit ${[100, 500, 2000][x]}`,
    						propertyID
    					).then(queryJson => {
    						//I am not sure why the condition here is unique compared to others, but it shouldn't make a difference
    						//Unless unique steps need to  be taken in case of a timeout
    						if (!("results" in queryJson.data)) {
    							console.log(`Error for slow ${["small", "medium", "big"][x]} query for: ${tripleDetails.selectedProperty} (${propertyID}):\n` + `${queryJson.data}\n` + `TripleDetails for debugging:\n` + `select distinct ?value ?valueLabel\n` + `where {\n` + `    ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .\n` + `    ${(nameLine === null || nameLine === void 0
							? void 0
							: nameLine.wantedValue)
							? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`
							: ""}\n` + `    ${queryLines.map(formatTripleAndFilter).join("")}\n` + `    bind(${queryLines[tripleIndex].value} as ?value)\n` + `    service wikibase:label { \n` + `        bd:serviceParam wikibase:language "cs" .\n` + `        ?value rdfs:label ?valueLabel .\n` + `    }\n` + `    filter(lang(?valueLabel) = "cs")\n` + `} limit ${[50, 250, 1500][x]}`);
    						} else if (queryJson.queryID == GlobalVariables.queryEntityInfo[tripleDetails.selectedProperty].id && currentOption == searchInputValuesOption) {
    							$$invalidate(1, examples = queryJson.data.results.bindings.map(x => x.valueLabel.value));
    						}

    						console.log(`Slow ${["small", "medium", "big"][x]} query for ${tripleDetails.selectedProperty} (${propertyID}) was loaded`);
    					}).catch(err => {
    						console.log(`Unexpected error for slow ${["small", "medium", "big"][x]} query for: ${tripleDetails.selectedProperty} (${propertyID}):\n` + `${err}`);
    					});

    					renewOnclickEvents();
    				}
    				break;
    		}

    		$$invalidate(2, LoadingExamples = false);
    	}

    	//Gives each option an onClick event when the options are reset
    	function renewOnclickEvents() {
    		//HTML type is not used due to each element not having the same amount of properties
    		let inputBox = document.getElementById("stringInput" + tripleDetails.tripleID); /*HTMLInputElement*/

    		let exampleValues = document.getElementById("examplesDatalist" + tripleDetails.tripleID); /*HTMLDataListElement*/
    		let container = document.getElementById("stringInputContainer" + tripleDetails.tripleID); /*HTMLDivElement*/

    		//Set as a timeout to ensure that the html elements have been loaded
    		setTimeout(() => {
    			for (let option of exampleValues.options) {
    				option.onclick = function () {
    					inputBox.value = option.value;
    					inputBox.dispatchEvent(new Event("change"));
    					container.style.zIndex = "0";
    					exampleValues.style.display = 'none';
    					inputBox.style.borderRadius = "3px";
    				};
    			}
    		});
    	}

    	//Set as a timeout to ensure that the html elements have been loaded
    	setTimeout(() => {
    		//True types are commented, becuase of ridiculous type requirements (e.g. 56 more required properties)
    		let inputBox = document.getElementById("stringInput" + tripleDetails.tripleID); /*HTMLInputElement*/

    		let exampleValues = document.getElementById("examplesDatalist" + tripleDetails.tripleID); /*HTMLDataListElement*/
    		let container = document.getElementById("stringInputContainer" + tripleDetails.tripleID); /*HTMLDivElement*/
    		let currentFocus = -1;
    		renewOnclickEvents();

    		inputBox.onfocus = function () {
    			container.style.zIndex = (100 - tripleDetails.tripleID).toString();
    			exampleValues.style.display = 'block';
    			inputBox.style.borderRadius = "3px 3px 0 0";
    		};

    		//onblur disrupts options.onclick, so this method of unfocusing was chosen instead
    		//It can theoretically overload the element with listeners, but the user would have to be incredibly indecisive for a long period of time
    		document.addEventListener("click", function (e) {
    			if (!container.contains(e.target)) {
    				container.style.zIndex = "0";
    				exampleValues.style.display = "none";
    				inputBox.style.borderRadius = "3px";
    			}
    		});

    		//Takes care of filtering options according to user input
    		inputBox.oninput = function () {
    			currentFocus = -1;
    			let text = inputBox.value.toUpperCase();

    			for (let option of exampleValues.options) {
    				if (option.value.toUpperCase().indexOf(text) > -1) {
    					option.style.display = "block";
    				} else {
    					option.style.display = "none";
    				}
    			}
    		};

    		//Adds the possibility of using the keyboard to navigate the options
    		inputBox.onkeydown = function (e) {
    			if (e.keyCode == 40) {
    				currentFocus++;
    				addActive(exampleValues.options);
    			} else if (e.keyCode == 38) {
    				currentFocus--;
    				addActive(exampleValues.options);
    			} else if (e.keyCode == 13) {
    				e.preventDefault();

    				if (currentFocus > -1) {
    					/*simulate a click on the "active" item:*/
    					if (exampleValues.options) exampleValues.options[currentFocus].click();
    				}
    			}
    		};

    		function addActive(x) {
    			if (!x) return;
    			removeActive(x);
    			if (currentFocus >= x.length) currentFocus = 0;
    			if (currentFocus < 0) currentFocus = x.length - 1;
    			x[currentFocus].classList.add("active");
    		}

    		function removeActive(x) {
    			for (var i = 0; i < x.length; i++) {
    				x[i].classList.remove("active");
    			}
    		}
    	});

    	const writable_props = ['searchInputValuesOption', 'allTriples', 'tripleDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$2.warn(`<SearchInput> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('searchInputValuesOption' in $$props) $$invalidate(4, searchInputValuesOption = $$props.searchInputValuesOption);
    		if ('allTriples' in $$props) $$invalidate(5, allTriples = $$props.allTriples);
    		if ('tripleDetails' in $$props) $$invalidate(0, tripleDetails = $$props.tripleDetails);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		InfoSign: InfoSign$1,
    		GlobalVariables,
    		SPARQLQueryDispatcher,
    		dispatch,
    		handleInputChange,
    		searchInputValuesOption,
    		allTriples,
    		tripleDetails,
    		queryDispatcher,
    		examples,
    		LoadingExamples,
    		queryExampleValues,
    		renewOnclickEvents,
    		temp
    	});

    	$$self.$inject_state = $$props => {
    		if ('searchInputValuesOption' in $$props) $$invalidate(4, searchInputValuesOption = $$props.searchInputValuesOption);
    		if ('allTriples' in $$props) $$invalidate(5, allTriples = $$props.allTriples);
    		if ('tripleDetails' in $$props) $$invalidate(0, tripleDetails = $$props.tripleDetails);
    		if ('examples' in $$props) $$invalidate(1, examples = $$props.examples);
    		if ('LoadingExamples' in $$props) $$invalidate(2, LoadingExamples = $$props.LoadingExamples);
    		if ('temp' in $$props) $$invalidate(6, temp = $$props.temp);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tripleDetails*/ 1) {
    			//Will trigger this function when the triple's property or the query option changes
    			$$invalidate(6, temp = tripleDetails.selectedProperty);
    		}

    		if ($$self.$$.dirty & /*temp, searchInputValuesOption*/ 80) {
    			(queryExampleValues());
    		}
    	};

    	return [
    		tripleDetails,
    		examples,
    		LoadingExamples,
    		handleInputChange,
    		searchInputValuesOption,
    		allTriples,
    		temp
    	];
    }

    class SearchInput extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {
    			searchInputValuesOption: 4,
    			allTriples: 5,
    			tripleDetails: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SearchInput",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*searchInputValuesOption*/ ctx[4] === undefined && !('searchInputValuesOption' in props)) {
    			console_1$2.warn("<SearchInput> was created without expected prop 'searchInputValuesOption'");
    		}

    		if (/*allTriples*/ ctx[5] === undefined && !('allTriples' in props)) {
    			console_1$2.warn("<SearchInput> was created without expected prop 'allTriples'");
    		}

    		if (/*tripleDetails*/ ctx[0] === undefined && !('tripleDetails' in props)) {
    			console_1$2.warn("<SearchInput> was created without expected prop 'tripleDetails'");
    		}
    	}

    	get searchInputValuesOption() {
    		throw new Error("<SearchInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set searchInputValuesOption(value) {
    		throw new Error("<SearchInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allTriples() {
    		throw new Error("<SearchInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allTriples(value) {
    		throw new Error("<SearchInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tripleDetails() {
    		throw new Error("<SearchInput>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tripleDetails(value) {
    		throw new Error("<SearchInput>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryBuilder\IndividualTripleManager.svelte generated by Svelte v3.48.0 */
    const file$4 = "src\\components\\queryBuilder\\IndividualTripleManager.svelte";

    // (61:4) {:else}
    function create_else_block$3(ctx) {
    	let initialbutton;
    	let t;
    	let show_if;
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;

    	initialbutton = new BasicSelectInput({
    			props: {
    				items: /*itemsProperties*/ ctx[3],
    				defaultValue: /*tripleDetails*/ ctx[0].selectedProperty,
    				desc: "Který má/je/se: "
    			},
    			$$inline: true
    		});

    	initialbutton.$on("change", /*receivePropertyChange*/ ctx[6]);

    	const if_block_creators = [
    		create_if_block_1$3,
    		create_if_block_2$2,
    		create_if_block_3$1,
    		create_if_block_4,
    		create_if_block_5,
    		create_if_block_6
    	];

    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (dirty & /*itemsProperties, tripleDetails*/ 9) show_if = null;
    		if (show_if == null) show_if = !!!/*itemsProperties*/ ctx[3].includes(/*tripleDetails*/ ctx[0].selectedProperty);
    		if (show_if) return 0;
    		if (/*TypeOfPropertyValue*/ ctx[4] == "string") return 1;
    		if (/*TypeOfPropertyValue*/ ctx[4] == "date") return 2;
    		if (/*TypeOfPropertyValue*/ ctx[4] == "number") return 3;
    		if (/*TypeOfPropertyValue*/ ctx[4] == "link" || /*TypeOfPropertyValue*/ ctx[4] == "image") return 4;
    		if (/*TypeOfPropertyValue*/ ctx[4] == "coordinates") return 5;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(ctx, -1))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			create_component(initialbutton.$$.fragment);
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			mount_component(initialbutton, target, anchor);
    			insert_dev(target, t, anchor);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(target, anchor);
    			}

    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const initialbutton_changes = {};
    			if (dirty & /*itemsProperties*/ 8) initialbutton_changes.items = /*itemsProperties*/ ctx[3];
    			if (dirty & /*tripleDetails*/ 1) initialbutton_changes.defaultValue = /*tripleDetails*/ ctx[0].selectedProperty;
    			initialbutton.$set(initialbutton_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx, dirty);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(initialbutton.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(initialbutton.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(initialbutton, detaching);
    			if (detaching) detach_dev(t);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(61:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (59:4) {#if !tripleDetails.selectedItem}
    function create_if_block$3(ctx) {
    	let initialbutton;
    	let current;

    	initialbutton = new BasicSelectInput({
    			props: { items: [], desc: "Který ..." },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(initialbutton.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(initialbutton, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(initialbutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(initialbutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(initialbutton, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(59:4) {#if !tripleDetails.selectedItem}",
    		ctx
    	});

    	return block;
    }

    // (74:55) 
    function create_if_block_6(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			input.disabled = true;
    			attr_dev(input, "placeholder", "Poloha souřadnic se objeví na mapě");
    			set_style(input, "width", "270px");
    			attr_dev(input, "class", "svelte-kb9lk4");
    			add_location(input, file$4, 74, 12, 3612);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(74:55) ",
    		ctx
    	});

    	return block;
    }

    // (72:82) 
    function create_if_block_5(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			input.disabled = true;
    			attr_dev(input, "placeholder", "Výsledek bude ve formě odkazu");
    			set_style(input, "width", "250px");
    			attr_dev(input, "class", "svelte-kb9lk4");
    			add_location(input, file$4, 72, 12, 3461);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(72:82) ",
    		ctx
    	});

    	return block;
    }

    // (70:50) 
    function create_if_block_4(ctx) {
    	let numberinput;
    	let current;

    	numberinput = new NumberInput({
    			props: { tripleDetails: /*tripleDetails*/ ctx[0] },
    			$$inline: true
    		});

    	numberinput.$on("IntervalChange", /*receiveNumberIntervalChange*/ ctx[8]);
    	numberinput.$on("InputChange", /*receiveValueChange*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(numberinput.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(numberinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const numberinput_changes = {};
    			if (dirty & /*tripleDetails*/ 1) numberinput_changes.tripleDetails = /*tripleDetails*/ ctx[0];
    			numberinput.$set(numberinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(numberinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(numberinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(numberinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(70:50) ",
    		ctx
    	});

    	return block;
    }

    // (68:48) 
    function create_if_block_3$1(ctx) {
    	let dateinput;
    	let current;

    	dateinput = new DateInput({
    			props: { tripleDetails: /*tripleDetails*/ ctx[0] },
    			$$inline: true
    		});

    	dateinput.$on("PeriodChange", /*receiveTimePeriodChange*/ ctx[7]);
    	dateinput.$on("InputChange", /*receiveValueChange*/ ctx[9]);
    	dateinput.$on("PrecisionChange", /*receiveTimePrecisionChange*/ ctx[10]);

    	const block = {
    		c: function create() {
    			create_component(dateinput.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(dateinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const dateinput_changes = {};
    			if (dirty & /*tripleDetails*/ 1) dateinput_changes.tripleDetails = /*tripleDetails*/ ctx[0];
    			dateinput.$set(dateinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(dateinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(dateinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(dateinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(68:48) ",
    		ctx
    	});

    	return block;
    }

    // (66:50) 
    function create_if_block_2$2(ctx) {
    	let searchinput;
    	let current;

    	searchinput = new SearchInput({
    			props: {
    				allTriples: /*allTriples*/ ctx[2],
    				tripleDetails: /*tripleDetails*/ ctx[0],
    				searchInputValuesOption: /*searchInputValuesOption*/ ctx[1]
    			},
    			$$inline: true
    		});

    	searchinput.$on("InputChange", /*receiveValueChange*/ ctx[9]);

    	const block = {
    		c: function create() {
    			create_component(searchinput.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(searchinput, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const searchinput_changes = {};
    			if (dirty & /*allTriples*/ 4) searchinput_changes.allTriples = /*allTriples*/ ctx[2];
    			if (dirty & /*tripleDetails*/ 1) searchinput_changes.tripleDetails = /*tripleDetails*/ ctx[0];
    			if (dirty & /*searchInputValuesOption*/ 2) searchinput_changes.searchInputValuesOption = /*searchInputValuesOption*/ ctx[1];
    			searchinput.$set(searchinput_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchinput.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchinput.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(searchinput, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(66:50) ",
    		ctx
    	});

    	return block;
    }

    // (64:8) {#if !itemsProperties.includes(tripleDetails.selectedProperty)}
    function create_if_block_1$3(ctx) {
    	let input;

    	const block = {
    		c: function create() {
    			input = element("input");
    			input.disabled = true;
    			attr_dev(input, "class", "svelte-kb9lk4");
    			add_location(input, file$4, 64, 12, 2741);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, input, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(input);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(64:8) {#if !itemsProperties.includes(tripleDetails.selectedProperty)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let initialbutton;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	initialbutton = new BasicSelectInput({
    			props: {
    				items: /*tripleDetails*/ ctx[0].items,
    				defaultValue: /*tripleDetails*/ ctx[0].selectedItem,
    				desc: "Hledám: "
    			},
    			$$inline: true
    		});

    	initialbutton.$on("change", /*receiveItemChange*/ ctx[5]);
    	const if_block_creators = [create_if_block$3, create_else_block$3];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*tripleDetails*/ ctx[0].selectedItem) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(initialbutton.$$.fragment);
    			t = space();
    			if_block.c();
    			set_style(div, "padding", "8px");
    			set_style(div, "z-index", "1");
    			add_location(div, file$4, 56, 0, 2099);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(initialbutton, div, null);
    			append_dev(div, t);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const initialbutton_changes = {};
    			if (dirty & /*tripleDetails*/ 1) initialbutton_changes.items = /*tripleDetails*/ ctx[0].items;
    			if (dirty & /*tripleDetails*/ 1) initialbutton_changes.defaultValue = /*tripleDetails*/ ctx[0].selectedItem;
    			initialbutton.$set(initialbutton_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(initialbutton.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(initialbutton.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(initialbutton);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('IndividualTripleManager', slots, []);
    	let { searchInputValuesOption = 0 } = $$props;
    	let { allTriples } = $$props;
    	let { tripleDetails } = $$props;
    	const dispatch = createEventDispatcher();

    	function tripleDetailsChange() {
    		dispatch("tripleDetailsChange", tripleDetails);
    	}

    	function receiveItemChange(event) {
    		$$invalidate(0, tripleDetails.selectedItem = event.detail.newValue, tripleDetails);
    		$$invalidate(0, tripleDetails.selectedProperty = "", tripleDetails);
    		$$invalidate(0, tripleDetails.selectedValue = "", tripleDetails);
    		tripleDetailsChange();
    	}

    	function receivePropertyChange(event) {
    		$$invalidate(0, tripleDetails.selectedProperty = event.detail.newValue, tripleDetails);
    		$$invalidate(0, tripleDetails.selectedValue = "", tripleDetails);
    		tripleDetailsChange();
    	}

    	function receiveTimePeriodChange(event) {
    		$$invalidate(0, tripleDetails["selectedTimePeriod"] = event.detail.newValue, tripleDetails);
    		tripleDetailsChange();
    	}

    	function receiveNumberIntervalChange(event) {
    		$$invalidate(0, tripleDetails["selectedNumberInterval"] = event.detail.newValue, tripleDetails);
    		tripleDetailsChange();
    	}

    	function receiveValueChange(event) {
    		$$invalidate(0, tripleDetails.selectedValue = event.detail.inputValue, tripleDetails);
    		tripleDetailsChange();
    	}

    	function receiveTimePrecisionChange(event) {
    		$$invalidate(0, tripleDetails["selectedTimePrecision"] = event.detail.newValue, tripleDetails);
    		tripleDetailsChange();
    	}

    	let itemsProperties;
    	let TypeOfPropertyValue;
    	const writable_props = ['searchInputValuesOption', 'allTriples', 'tripleDetails'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<IndividualTripleManager> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('searchInputValuesOption' in $$props) $$invalidate(1, searchInputValuesOption = $$props.searchInputValuesOption);
    		if ('allTriples' in $$props) $$invalidate(2, allTriples = $$props.allTriples);
    		if ('tripleDetails' in $$props) $$invalidate(0, tripleDetails = $$props.tripleDetails);
    	};

    	$$self.$capture_state = () => ({
    		InitialButton: BasicSelectInput,
    		NumberInput,
    		DateInput,
    		SearchInput,
    		GlobalVariables,
    		searchInputValuesOption,
    		allTriples,
    		tripleDetails,
    		createEventDispatcher,
    		dispatch,
    		tripleDetailsChange,
    		receiveItemChange,
    		receivePropertyChange,
    		receiveTimePeriodChange,
    		receiveNumberIntervalChange,
    		receiveValueChange,
    		receiveTimePrecisionChange,
    		itemsProperties,
    		TypeOfPropertyValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('searchInputValuesOption' in $$props) $$invalidate(1, searchInputValuesOption = $$props.searchInputValuesOption);
    		if ('allTriples' in $$props) $$invalidate(2, allTriples = $$props.allTriples);
    		if ('tripleDetails' in $$props) $$invalidate(0, tripleDetails = $$props.tripleDetails);
    		if ('itemsProperties' in $$props) $$invalidate(3, itemsProperties = $$props.itemsProperties);
    		if ('TypeOfPropertyValue' in $$props) $$invalidate(4, TypeOfPropertyValue = $$props.TypeOfPropertyValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*tripleDetails*/ 1) {
    			//These variables will update whenever tripleDetails is changed
    			$$invalidate(3, itemsProperties = tripleDetails.selectedItem
    			? GlobalVariables.queryEntityProperties[tripleDetails.selectedItem]
    			: undefined);
    		}

    		if ($$self.$$.dirty & /*tripleDetails*/ 1) {
    			$$invalidate(4, TypeOfPropertyValue = tripleDetails.selectedProperty
    			? GlobalVariables.queryEntityInfo[tripleDetails.selectedProperty].valueType
    			: undefined);
    		}
    	};

    	return [
    		tripleDetails,
    		searchInputValuesOption,
    		allTriples,
    		itemsProperties,
    		TypeOfPropertyValue,
    		receiveItemChange,
    		receivePropertyChange,
    		receiveTimePeriodChange,
    		receiveNumberIntervalChange,
    		receiveValueChange,
    		receiveTimePrecisionChange
    	];
    }

    class IndividualTripleManager extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			searchInputValuesOption: 1,
    			allTriples: 2,
    			tripleDetails: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "IndividualTripleManager",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*allTriples*/ ctx[2] === undefined && !('allTriples' in props)) {
    			console.warn("<IndividualTripleManager> was created without expected prop 'allTriples'");
    		}

    		if (/*tripleDetails*/ ctx[0] === undefined && !('tripleDetails' in props)) {
    			console.warn("<IndividualTripleManager> was created without expected prop 'tripleDetails'");
    		}
    	}

    	get searchInputValuesOption() {
    		throw new Error("<IndividualTripleManager>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set searchInputValuesOption(value) {
    		throw new Error("<IndividualTripleManager>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get allTriples() {
    		throw new Error("<IndividualTripleManager>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set allTriples(value) {
    		throw new Error("<IndividualTripleManager>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tripleDetails() {
    		throw new Error("<IndividualTripleManager>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tripleDetails(value) {
    		throw new Error("<IndividualTripleManager>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryResults\InfoSign.svelte generated by Svelte v3.48.0 */

    const file$3 = "src\\components\\queryResults\\InfoSign.svelte";

    function create_fragment$3(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			if (!src_url_equal(img.src, img_src_value = "./info.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "title", /*text*/ ctx[0]);
    			attr_dev(img, "width", "14");
    			attr_dev(img, "height", "14");
    			attr_dev(img, "alt", "text");
    			add_location(img, file$3, 7, 0, 77);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) {
    				attr_dev(img, "title", /*text*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('InfoSign', slots, []);
    	let { text = "" } = $$props;
    	const writable_props = ['text'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<InfoSign> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	$$self.$capture_state = () => ({ text });

    	$$self.$inject_state = $$props => {
    		if ('text' in $$props) $$invalidate(0, text = $$props.text);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [text];
    }

    class InfoSign extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { text: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "InfoSign",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get text() {
    		throw new Error("<InfoSign>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set text(value) {
    		throw new Error("<InfoSign>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryResults\OptionsScreen.svelte generated by Svelte v3.48.0 */
    const file$2 = "src\\components\\queryResults\\OptionsScreen.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    // (122:38) 
    function create_if_block_2$1(ctx) {
    	let li;
    	let input;
    	let t0;
    	let label;
    	let t1;
    	let infosign;
    	let current;
    	let mounted;
    	let dispose;

    	infosign = new InfoSign({
    			props: {
    				text: "Zobrazení lze zmenit v levé části tabulky"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text("Zobrazit hned s obrázky ");
    			create_component(infosign.$$.fragment);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "viewImageOption");
    			input.checked = /*viewImageOption*/ ctx[5];
    			attr_dev(input, "class", "svelte-1t9ttau");
    			add_location(input, file$2, 123, 20, 3957);
    			attr_dev(label, "for", "viewImageOption");
    			add_location(label, file$2, 124, 20, 4077);
    			attr_dev(li, "class", "svelte-1t9ttau");
    			add_location(li, file$2, 122, 16, 3931);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, t1);
    			mount_component(infosign, label, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*toggleImageView*/ ctx[15], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*viewImageOption*/ 32) {
    				prop_dev(input, "checked", /*viewImageOption*/ ctx[5]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(infosign);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(122:38) ",
    		ctx
    	});

    	return block;
    }

    // (117:12) {#if viewMapOption}
    function create_if_block_1$2(ctx) {
    	let li;
    	let input;
    	let t0;
    	let label;
    	let t1;
    	let infosign;
    	let current;
    	let mounted;
    	let dispose;

    	infosign = new InfoSign({
    			props: {
    				text: "Zobrazení lze zmenit v levé části mapy"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			t0 = space();
    			label = element("label");
    			t1 = text("Zobrazit hned jako mapu ");
    			create_component(infosign.$$.fragment);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "viewMapOption");
    			input.checked = /*viewMapOption*/ ctx[6];
    			attr_dev(input, "class", "svelte-1t9ttau");
    			add_location(input, file$2, 118, 20, 3610);
    			attr_dev(label, "for", "viewMapOption");
    			add_location(label, file$2, 119, 20, 3724);
    			attr_dev(li, "class", "svelte-1t9ttau");
    			add_location(li, file$2, 117, 16, 3584);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			append_dev(li, t0);
    			append_dev(li, label);
    			append_dev(label, t1);
    			mount_component(infosign, label, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*toggleMapView*/ ctx[14], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty & /*viewMapOption*/ 64) {
    				prop_dev(input, "checked", /*viewMapOption*/ ctx[6]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(infosign);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(117:12) {#if viewMapOption}",
    		ctx
    	});

    	return block;
    }

    // (134:12) {#each labels as x, i}
    function create_each_block$1(ctx) {
    	let li;
    	let input;
    	let input_checked_value;
    	let label;
    	let t_value = /*x*/ ctx[19].slice(1) + "";
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			li = element("li");
    			input = element("input");
    			label = element("label");
    			t = text(t_value);
    			attr_dev(input, "type", "checkbox");
    			attr_dev(input, "id", "variable" + /*i*/ ctx[21]);
    			input.checked = input_checked_value = /*labelsDisplayParity*/ ctx[8][/*i*/ ctx[21]];
    			attr_dev(input, "class", "svelte-1t9ttau");
    			add_location(input, file$2, 134, 20, 4495);
    			attr_dev(label, "for", "variable" + /*i*/ ctx[21]);
    			attr_dev(label, "class", "svelte-1t9ttau");
    			add_location(label, file$2, 134, 130, 4605);
    			attr_dev(li, "class", "svelte-1t9ttau");
    			add_location(li, file$2, 134, 16, 4491);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, input);
    			append_dev(li, label);
    			append_dev(label, t);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*toggleVariableDisplay*/ ctx[16], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*labelsDisplayParity*/ 256 && input_checked_value !== (input_checked_value = /*labelsDisplayParity*/ ctx[8][/*i*/ ctx[21]])) {
    				prop_dev(input, "checked", input_checked_value);
    			}

    			if (dirty & /*labels*/ 128 && t_value !== (t_value = /*x*/ ctx[19].slice(1) + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(134:12) {#each labels as x, i}",
    		ctx
    	});

    	return block;
    }

    // (142:4) {:else}
    function create_else_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Pokračovat";
    			attr_dev(button, "id", "continueButton");
    			button.disabled = true;
    			attr_dev(button, "class", "svelte-1t9ttau");
    			add_location(button, file$2, 142, 8, 4833);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleIframe*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(142:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (140:4) {#if validity}
    function create_if_block$2(ctx) {
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Pokračovat";
    			attr_dev(button, "id", "continueButton");
    			attr_dev(button, "class", "svelte-1t9ttau");
    			add_location(button, file$2, 140, 8, 4739);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleIframe*/ ctx[10], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(140:4) {#if validity}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div2;
    	let p;
    	let t0;
    	let t1;
    	let t2;
    	let input0;
    	let t3;
    	let infosign0;
    	let t4;
    	let br0;
    	let t5;
    	let div0;
    	let ul0;
    	let li0;
    	let input1;
    	let t6;
    	let label0;
    	let t7;
    	let infosign1;
    	let t8;
    	let li1;
    	let input2;
    	let t9;
    	let label1;
    	let t10;
    	let infosign2;
    	let t11;
    	let li2;
    	let input3;
    	let t12;
    	let label2;
    	let t14;
    	let current_block_type_index;
    	let if_block0;
    	let t15;
    	let br1;
    	let t16;
    	let div1;
    	let label3;
    	let t18;
    	let ul1;
    	let t19;
    	let current;
    	let mounted;
    	let dispose;

    	infosign0 = new InfoSign({
    			props: {
    				text: "Doporučeno v případě, že načítaní trvá moc dlouho"
    			},
    			$$inline: true
    		});

    	infosign1 = new InfoSign({
    			props: {
    				text: "Angličtina, němčina, španělština, ..."
    			},
    			$$inline: true
    		});

    	infosign2 = new InfoSign({
    			props: {
    				text: "Pomalejší, ale potřebné, když jste zadali jen část jména nebo názvu"
    			},
    			$$inline: true
    		});

    	const if_block_creators = [create_if_block_1$2, create_if_block_2$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*viewMapOption*/ ctx[6]) return 0;
    		if (/*viewImageOption*/ ctx[5]) return 1;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	let each_value = /*labels*/ ctx[7];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	function select_block_type_1(ctx, dirty) {
    		if (/*validity*/ ctx[0]) return create_if_block$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			p = element("p");
    			t0 = text("Počet výsledků bez filterů: ");
    			t1 = text(/*queryResultsCount*/ ctx[2]);
    			t2 = text("\r\n\r\n    \r\n    \r\n    Limit na počet výsledků: ");
    			input0 = element("input");
    			t3 = space();
    			create_component(infosign0.$$.fragment);
    			t4 = space();
    			br0 = element("br");
    			t5 = space();
    			div0 = element("div");
    			ul0 = element("ul");
    			li0 = element("li");
    			input1 = element("input");
    			t6 = space();
    			label0 = element("label");
    			t7 = text("Hledat výsledky i v ostatních jazycích ");
    			create_component(infosign1.$$.fragment);
    			t8 = space();
    			li1 = element("li");
    			input2 = element("input");
    			t9 = space();
    			label1 = element("label");
    			t10 = text("Důkladnější hledání zadaných hodnot ");
    			create_component(infosign2.$$.fragment);
    			t11 = space();
    			li2 = element("li");
    			input3 = element("input");
    			t12 = space();
    			label2 = element("label");
    			label2.textContent = "Najít výsledky se stránkou na Wikipédii";
    			t14 = space();
    			if (if_block0) if_block0.c();
    			t15 = space();
    			br1 = element("br");
    			t16 = space();
    			div1 = element("div");
    			label3 = element("label");
    			label3.textContent = "Vyberte vlastnosti, které uvidíte";
    			t18 = space();
    			ul1 = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t19 = space();
    			if_block1.c();
    			set_style(p, "font-weight", "500");
    			attr_dev(p, "class", "svelte-1t9ttau");
    			add_location(p, file$2, 91, 4, 2099);
    			attr_dev(input0, "type", "number");
    			input0.value = /*resultsLimit*/ ctx[1];
    			set_style(input0, "width", "100px");
    			add_location(input0, file$2, 98, 29, 2360);
    			add_location(br0, file$2, 100, 4, 2544);
    			attr_dev(input1, "type", "checkbox");
    			attr_dev(input1, "id", "languageOption");
    			input1.checked = /*languageOption*/ ctx[3];
    			attr_dev(input1, "class", "svelte-1t9ttau");
    			add_location(input1, file$2, 105, 16, 2634);
    			attr_dev(label0, "for", "languageOption");
    			add_location(label0, file$2, 106, 16, 2753);
    			attr_dev(li0, "class", "svelte-1t9ttau");
    			add_location(li0, file$2, 104, 12, 2612);
    			attr_dev(input2, "type", "checkbox");
    			attr_dev(input2, "id", "thoroughFilterOption");
    			input2.checked = /*thoroughFilterOption*/ ctx[4];
    			attr_dev(input2, "class", "svelte-1t9ttau");
    			add_location(input2, file$2, 109, 16, 2949);
    			attr_dev(label1, "for", "thoroughFilterOption");
    			add_location(label1, file$2, 110, 16, 3078);
    			attr_dev(li1, "class", "svelte-1t9ttau");
    			add_location(li1, file$2, 108, 12, 2927);
    			attr_dev(input3, "type", "checkbox");
    			attr_dev(input3, "id", "wikiArticleOption");
    			input3.checked = /*displayWikiArticle*/ ctx[9];
    			attr_dev(input3, "class", "svelte-1t9ttau");
    			add_location(input3, file$2, 113, 16, 3307);
    			attr_dev(label2, "for", "wikiArticleOption");
    			add_location(label2, file$2, 114, 16, 3436);
    			attr_dev(li2, "class", "svelte-1t9ttau");
    			add_location(li2, file$2, 112, 12, 3285);
    			attr_dev(ul0, "class", "svelte-1t9ttau");
    			add_location(ul0, file$2, 103, 8, 2594);
    			attr_dev(div0, "class", "displayOptions svelte-1t9ttau");
    			add_location(div0, file$2, 102, 4, 2556);
    			add_location(br1, file$2, 129, 4, 4283);
    			attr_dev(label3, "for", "displayVariables");
    			attr_dev(label3, "class", "svelte-1t9ttau");
    			add_location(label3, file$2, 131, 8, 4352);
    			attr_dev(ul1, "class", "svelte-1t9ttau");
    			add_location(ul1, file$2, 132, 8, 4433);
    			attr_dev(div1, "class", "displayOptions svelte-1t9ttau");
    			attr_dev(div1, "id", "diplayVariables");
    			add_location(div1, file$2, 130, 4, 4293);
    			attr_dev(div2, "id", "main");
    			attr_dev(div2, "class", "svelte-1t9ttau");
    			add_location(div2, file$2, 90, 0, 2078);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, p);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			append_dev(div2, t2);
    			append_dev(div2, input0);
    			append_dev(div2, t3);
    			mount_component(infosign0, div2, null);
    			append_dev(div2, t4);
    			append_dev(div2, br0);
    			append_dev(div2, t5);
    			append_dev(div2, div0);
    			append_dev(div0, ul0);
    			append_dev(ul0, li0);
    			append_dev(li0, input1);
    			append_dev(li0, t6);
    			append_dev(li0, label0);
    			append_dev(label0, t7);
    			mount_component(infosign1, label0, null);
    			append_dev(ul0, t8);
    			append_dev(ul0, li1);
    			append_dev(li1, input2);
    			append_dev(li1, t9);
    			append_dev(li1, label1);
    			append_dev(label1, t10);
    			mount_component(infosign2, label1, null);
    			append_dev(ul0, t11);
    			append_dev(ul0, li2);
    			append_dev(li2, input3);
    			append_dev(li2, t12);
    			append_dev(li2, label2);
    			append_dev(ul0, t14);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(ul0, null);
    			}

    			append_dev(div2, t15);
    			append_dev(div2, br1);
    			append_dev(div2, t16);
    			append_dev(div2, div1);
    			append_dev(div1, label3);
    			append_dev(div1, t18);
    			append_dev(div1, ul1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul1, null);
    			}

    			append_dev(div2, t19);
    			if_block1.m(div2, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*changeResultsLimit*/ ctx[17], false, false, false),
    					listen_dev(input1, "change", /*toggleLanguageOption*/ ctx[11], false, false, false),
    					listen_dev(input2, "change", /*toggleFilterOption*/ ctx[12], false, false, false),
    					listen_dev(input3, "change", /*toggleWikiArticleOption*/ ctx[13], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*queryResultsCount*/ 4) set_data_dev(t1, /*queryResultsCount*/ ctx[2]);

    			if (!current || dirty & /*resultsLimit*/ 2 && input0.value !== /*resultsLimit*/ ctx[1]) {
    				prop_dev(input0, "value", /*resultsLimit*/ ctx[1]);
    			}

    			if (!current || dirty & /*languageOption*/ 8) {
    				prop_dev(input1, "checked", /*languageOption*/ ctx[3]);
    			}

    			if (!current || dirty & /*thoroughFilterOption*/ 16) {
    				prop_dev(input2, "checked", /*thoroughFilterOption*/ ctx[4]);
    			}

    			if (!current || dirty & /*displayWikiArticle*/ 512) {
    				prop_dev(input3, "checked", /*displayWikiArticle*/ ctx[9]);
    			}

    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block0) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block0 = if_blocks[current_block_type_index];

    					if (!if_block0) {
    						if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block0.c();
    					} else {
    						if_block0.p(ctx, dirty);
    					}

    					transition_in(if_block0, 1);
    					if_block0.m(ul0, null);
    				} else {
    					if_block0 = null;
    				}
    			}

    			if (dirty & /*labels, labelsDisplayParity, toggleVariableDisplay*/ 65920) {
    				each_value = /*labels*/ ctx[7];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul1, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div2, null);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign0.$$.fragment, local);
    			transition_in(infosign1.$$.fragment, local);
    			transition_in(infosign2.$$.fragment, local);
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign0.$$.fragment, local);
    			transition_out(infosign1.$$.fragment, local);
    			transition_out(infosign2.$$.fragment, local);
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(infosign0);
    			destroy_component(infosign1);
    			destroy_component(infosign2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			destroy_each(each_blocks, detaching);
    			if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('OptionsScreen', slots, []);
    	const dispatch = createEventDispatcher();
    	let { validity } = $$props;
    	let { resultsLimit = 100 } = $$props;
    	let { queryResultsCount } = $$props;
    	let { languageOption } = $$props;
    	let { thoroughFilterOption } = $$props;
    	let { viewImageOption } = $$props;
    	let { viewMapOption } = $$props;
    	let { labels } = $$props;
    	let { labelsDisplayParity } = $$props;
    	let { displayWikiArticle } = $$props;

    	function toggleIframe() {
    		dispatch("toggleIframe");
    	}

    	function toggleLanguageOption(event) {
    		dispatch("toggleLanguageOption", { parity: event.srcElement.checked });
    	}

    	function toggleFilterOption(event) {
    		dispatch("toggleFilterOption", { parity: event.srcElement.checked });
    	}

    	function toggleWikiArticleOption(event) {
    		dispatch("toggleWikiArticleOption", { parity: event.srcElement.checked });
    	}

    	function toggleMapView(event) {
    		dispatch("toggleMapView", { parity: event.srcElement.checked });
    	}

    	function toggleImageView(event) {
    		dispatch("toggleImageView", { parity: event.srcElement.checked });
    	}

    	function toggleVariableDisplay(event) {
    		dispatch("toggleVariableDisplay", {
    			id: event.srcElement.id.slice(8),
    			parity: event.srcElement.checked
    		});
    	}

    	function changeResultsLimit(event) {
    		dispatch("updateResultsLimit", { resultsLimit: event.srcElement.value });
    	}

    	const writable_props = [
    		'validity',
    		'resultsLimit',
    		'queryResultsCount',
    		'languageOption',
    		'thoroughFilterOption',
    		'viewImageOption',
    		'viewMapOption',
    		'labels',
    		'labelsDisplayParity',
    		'displayWikiArticle'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<OptionsScreen> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('validity' in $$props) $$invalidate(0, validity = $$props.validity);
    		if ('resultsLimit' in $$props) $$invalidate(1, resultsLimit = $$props.resultsLimit);
    		if ('queryResultsCount' in $$props) $$invalidate(2, queryResultsCount = $$props.queryResultsCount);
    		if ('languageOption' in $$props) $$invalidate(3, languageOption = $$props.languageOption);
    		if ('thoroughFilterOption' in $$props) $$invalidate(4, thoroughFilterOption = $$props.thoroughFilterOption);
    		if ('viewImageOption' in $$props) $$invalidate(5, viewImageOption = $$props.viewImageOption);
    		if ('viewMapOption' in $$props) $$invalidate(6, viewMapOption = $$props.viewMapOption);
    		if ('labels' in $$props) $$invalidate(7, labels = $$props.labels);
    		if ('labelsDisplayParity' in $$props) $$invalidate(8, labelsDisplayParity = $$props.labelsDisplayParity);
    		if ('displayWikiArticle' in $$props) $$invalidate(9, displayWikiArticle = $$props.displayWikiArticle);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		InfoSign,
    		dispatch,
    		validity,
    		resultsLimit,
    		queryResultsCount,
    		languageOption,
    		thoroughFilterOption,
    		viewImageOption,
    		viewMapOption,
    		labels,
    		labelsDisplayParity,
    		displayWikiArticle,
    		toggleIframe,
    		toggleLanguageOption,
    		toggleFilterOption,
    		toggleWikiArticleOption,
    		toggleMapView,
    		toggleImageView,
    		toggleVariableDisplay,
    		changeResultsLimit
    	});

    	$$self.$inject_state = $$props => {
    		if ('validity' in $$props) $$invalidate(0, validity = $$props.validity);
    		if ('resultsLimit' in $$props) $$invalidate(1, resultsLimit = $$props.resultsLimit);
    		if ('queryResultsCount' in $$props) $$invalidate(2, queryResultsCount = $$props.queryResultsCount);
    		if ('languageOption' in $$props) $$invalidate(3, languageOption = $$props.languageOption);
    		if ('thoroughFilterOption' in $$props) $$invalidate(4, thoroughFilterOption = $$props.thoroughFilterOption);
    		if ('viewImageOption' in $$props) $$invalidate(5, viewImageOption = $$props.viewImageOption);
    		if ('viewMapOption' in $$props) $$invalidate(6, viewMapOption = $$props.viewMapOption);
    		if ('labels' in $$props) $$invalidate(7, labels = $$props.labels);
    		if ('labelsDisplayParity' in $$props) $$invalidate(8, labelsDisplayParity = $$props.labelsDisplayParity);
    		if ('displayWikiArticle' in $$props) $$invalidate(9, displayWikiArticle = $$props.displayWikiArticle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		validity,
    		resultsLimit,
    		queryResultsCount,
    		languageOption,
    		thoroughFilterOption,
    		viewImageOption,
    		viewMapOption,
    		labels,
    		labelsDisplayParity,
    		displayWikiArticle,
    		toggleIframe,
    		toggleLanguageOption,
    		toggleFilterOption,
    		toggleWikiArticleOption,
    		toggleMapView,
    		toggleImageView,
    		toggleVariableDisplay,
    		changeResultsLimit
    	];
    }

    class OptionsScreen extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {
    			validity: 0,
    			resultsLimit: 1,
    			queryResultsCount: 2,
    			languageOption: 3,
    			thoroughFilterOption: 4,
    			viewImageOption: 5,
    			viewMapOption: 6,
    			labels: 7,
    			labelsDisplayParity: 8,
    			displayWikiArticle: 9
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "OptionsScreen",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*validity*/ ctx[0] === undefined && !('validity' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'validity'");
    		}

    		if (/*queryResultsCount*/ ctx[2] === undefined && !('queryResultsCount' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'queryResultsCount'");
    		}

    		if (/*languageOption*/ ctx[3] === undefined && !('languageOption' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'languageOption'");
    		}

    		if (/*thoroughFilterOption*/ ctx[4] === undefined && !('thoroughFilterOption' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'thoroughFilterOption'");
    		}

    		if (/*viewImageOption*/ ctx[5] === undefined && !('viewImageOption' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'viewImageOption'");
    		}

    		if (/*viewMapOption*/ ctx[6] === undefined && !('viewMapOption' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'viewMapOption'");
    		}

    		if (/*labels*/ ctx[7] === undefined && !('labels' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'labels'");
    		}

    		if (/*labelsDisplayParity*/ ctx[8] === undefined && !('labelsDisplayParity' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'labelsDisplayParity'");
    		}

    		if (/*displayWikiArticle*/ ctx[9] === undefined && !('displayWikiArticle' in props)) {
    			console.warn("<OptionsScreen> was created without expected prop 'displayWikiArticle'");
    		}
    	}

    	get validity() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validity(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get resultsLimit() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set resultsLimit(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get queryResultsCount() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set queryResultsCount(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get languageOption() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set languageOption(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get thoroughFilterOption() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set thoroughFilterOption(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewImageOption() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewImageOption(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get viewMapOption() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set viewMapOption(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labels() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labels(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get labelsDisplayParity() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labelsDisplayParity(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get displayWikiArticle() {
    		throw new Error("<OptionsScreen>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set displayWikiArticle(value) {
    		throw new Error("<OptionsScreen>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\queryResults\finalDisplay.svelte generated by Svelte v3.48.0 */

    const { console: console_1$1 } = globals;
    const file$1 = "src\\components\\queryResults\\finalDisplay.svelte";

    // (280:4) {:else}
    function create_else_block$1(ctx) {
    	let button;
    	let t1;
    	let optionsscreen;
    	let t2;
    	let if_block_anchor;
    	let current;
    	let mounted;
    	let dispose;

    	optionsscreen = new OptionsScreen({
    			props: {
    				validity: /*queryValidity*/ ctx[10],
    				queryResultsCount: /*queryResultsCount*/ ctx[7],
    				resultsLimit: /*resultsLimit*/ ctx[0],
    				languageOption: /*labelLanguages*/ ctx[3] != "cs",
    				thoroughFilterOption: /*thoroughFilterOption*/ ctx[5],
    				viewMapOption: /*viewMapOption*/ ctx[1],
    				viewImageOption: /*viewImageOption*/ ctx[2],
    				labels: /*labels*/ ctx[11],
    				labelsDisplayParity: /*labelsDisplayParity*/ ctx[6],
    				displayWikiArticle: /*displayWikiArticle*/ ctx[4]
    			},
    			$$inline: true
    		});

    	optionsscreen.$on("toggleIframe", /*toggleIframe*/ ctx[12]);
    	optionsscreen.$on("updateResultsLimit", /*updateResultsLimit*/ ctx[19]);
    	optionsscreen.$on("toggleLanguageOption", /*toggleLanguageOption*/ ctx[14]);
    	optionsscreen.$on("toggleFilterOption", /*toggleFilterOption*/ ctx[15]);
    	optionsscreen.$on("toggleImageView", /*toggleImageView*/ ctx[17]);
    	optionsscreen.$on("toggleMapView", /*toggleMapView*/ ctx[18]);
    	optionsscreen.$on("toggleVariableDisplay", /*toggleVariableDisplay*/ ctx[13]);
    	optionsscreen.$on("toggleWikiArticleOption", /*toggleWikiArticleOption*/ ctx[16]);
    	let if_block = !/*queryValidity*/ ctx[10] && create_if_block_1$1(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "🔙";
    			t1 = space();
    			create_component(optionsscreen.$$.fragment);
    			t2 = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr_dev(button, "id", "backButton");
    			add_location(button, file$1, 280, 8, 13265);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(optionsscreen, target, anchor);
    			insert_dev(target, t2, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleResults*/ ctx[20], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			const optionsscreen_changes = {};
    			if (dirty[0] & /*queryResultsCount*/ 128) optionsscreen_changes.queryResultsCount = /*queryResultsCount*/ ctx[7];
    			if (dirty[0] & /*resultsLimit*/ 1) optionsscreen_changes.resultsLimit = /*resultsLimit*/ ctx[0];
    			if (dirty[0] & /*labelLanguages*/ 8) optionsscreen_changes.languageOption = /*labelLanguages*/ ctx[3] != "cs";
    			if (dirty[0] & /*thoroughFilterOption*/ 32) optionsscreen_changes.thoroughFilterOption = /*thoroughFilterOption*/ ctx[5];
    			if (dirty[0] & /*viewMapOption*/ 2) optionsscreen_changes.viewMapOption = /*viewMapOption*/ ctx[1];
    			if (dirty[0] & /*viewImageOption*/ 4) optionsscreen_changes.viewImageOption = /*viewImageOption*/ ctx[2];
    			if (dirty[0] & /*labelsDisplayParity*/ 64) optionsscreen_changes.labelsDisplayParity = /*labelsDisplayParity*/ ctx[6];
    			if (dirty[0] & /*displayWikiArticle*/ 16) optionsscreen_changes.displayWikiArticle = /*displayWikiArticle*/ ctx[4];
    			optionsscreen.$set(optionsscreen_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(optionsscreen.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(optionsscreen.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			destroy_component(optionsscreen, detaching);
    			if (detaching) detach_dev(t2);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(280:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (276:4) {#if iframeVisibilty}
    function create_if_block$1(ctx) {
    	let button;
    	let t1;
    	let iframe;
    	let iframe_src_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "🔙";
    			t1 = space();
    			iframe = element("iframe");
    			attr_dev(button, "id", "backButton");
    			add_location(button, file$1, 276, 8, 12947);
    			attr_dev(iframe, "class", "wikidataIframeSolo svelte-13yeun9");
    			set_style(iframe, "width", "90vw");
    			set_style(iframe, "height", "94vh");
    			set_style(iframe, "border", "none");
    			attr_dev(iframe, "title", "wikidata");
    			if (!src_url_equal(iframe.src, iframe_src_value = /*encodedMainQueryLink*/ ctx[9])) attr_dev(iframe, "src", iframe_src_value);
    			attr_dev(iframe, "referrerpolicy", "origin");
    			attr_dev(iframe, "sandbox", "allow-scripts allow-same-origin allow-popups");
    			add_location(iframe, file$1, 277, 8, 13016);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, iframe, anchor);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleIframe*/ ctx[12], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*encodedMainQueryLink*/ 512 && !src_url_equal(iframe.src, iframe_src_value = /*encodedMainQueryLink*/ ctx[9])) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(iframe);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(276:4) {#if iframeVisibilty}",
    		ctx
    	});

    	return block;
    }

    // (287:8) {#if !queryValidity}
    function create_if_block_1$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Vyplňtě prosím alespoň jednu vlastnot které není: Jméno";
    			set_style(p, "color", "#663333");
    			set_style(p, "font-size", "20px");
    			set_style(p, "text-align", "center");
    			add_location(p, file$1, 287, 12, 13993);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(287:8) {#if !queryValidity}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*iframeVisibilty*/ ctx[8]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			if_block.c();
    			add_location(div, file$1, 274, 0, 12905);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const iframeURL = 'https://query.wikidata.org/embed.html#';

    function instance$1($$self, $$props, $$invalidate) {
    	let encodedMainQueryLink;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('FinalDisplay', slots, []);
    	const dispatch = createEventDispatcher();
    	const queryDispatcher = new SPARQLQueryDispatcher('https://query.wikidata.org/sparql');
    	let { validTriples } = $$props;
    	let resultsLimit = 100;
    	let viewMapOption = false;
    	let viewImageOption = false;
    	let defaultViewOption = "#";

    	//Adds the possibility of the option to change the default view
    	//Coordinates overwrite images, because map view can display images as well
    	for (let x of validTriples) {
    		if (GlobalVariables.queryEntityInfo[x.selectedProperty].valueType == "image") {
    			viewImageOption = true;
    			defaultViewOption = "#defaultView:ImageGrid";
    		} else if (GlobalVariables.queryEntityInfo[x.selectedProperty].valueType == "coordinates") {
    			viewMapOption = true;
    			defaultViewOption = "#defaultView:Map";
    			break;
    		}
    	}

    	let labelLanguages = "cs";
    	let displayWikiArticle = false;
    	let thoroughFilterOption = false;
    	let nameLine;

    	//A check for a custom property (currently only "Jméno")
    	for (let x = validTriples.length - 1; x > -1; x--) {
    		if (validTriples[x].selectedProperty == "Jméno" || validTriples[x].selectedProperty == "Název") {
    			nameLine = {
    				item: "?0",
    				property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    				value: "",
    				wantedValue: validTriples[x].selectedValue
    			};

    			validTriples.splice(x, 1);
    		}
    	}

    	let queryValidity = validTriples.length != 0;
    	let queryLines = [];
    	let uniqueVariables = new Set();
    	let labels = [];
    	let labelsDisplayParity = [];
    	let mainQuery;
    	let resultCountQuery;
    	let queryResultsCount;

    	//Formats each triple into equal lines for the query
    	//There are different cases based on the type of value and if there is a wanted value
    	function formatTripleAndFilter(queryLine, lineIndex) {
    		let output = "";

    		switch (GlobalVariables.queryEntityInfo[validTriples[lineIndex].selectedProperty].valueType) {
    			case "string":
    				output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    				if (queryLine.wantedValue != "" && !thoroughFilterOption) output += `${queryLine.value} rdfs:label "${queryLine.wantedValue}"@cs .\n\t`;
    				break;
    			case "date":
    				output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    				if (queryLine.wantedValue != "") {
    					if (validTriples[lineIndex].selectedTimePeriod == "Přesně") {
    						switch (validTriples[lineIndex].selectedTimePrecision) {
    							case "Den":
    								output += `FILTER(DAY(${queryLine.value}) = DAY("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    							case "Měsíc":
    								output += `FILTER(MONTH(${queryLine.value}) =  MONTH("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    							case "Rok":
    								output += `FILTER(YEAR(${queryLine.value}) = YEAR("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    						}
    					} else {
    						let periodIntervalSymbol = ({ "Po": ">", "Před": "<" })[validTriples[lineIndex].selectedTimePeriod];

    						switch (validTriples[lineIndex].selectedTimePrecision) {
    							case "Rok":
    								output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 4)}-01-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    								break;
    							case "Měsíc":
    								output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 7)}-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    								break;
    							case "Den":
    								output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime)\n\t`;
    						}
    					}
    				}
    				break;
    			case "number":
    				output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .`;
    				if (queryLine.wantedValue != "") {
    					let intervalSymbol = ({
    						"Méně nebo rovno": "<=",
    						"Méně než": "<",
    						"Více nebo rovno": ">=",
    						"Více než": ">",
    						"Rovno": "="
    					})[validTriples[lineIndex].selectedNumberInterval];

    					output += `FILTER(${queryLine.value} ${intervalSymbol} ${queryLine.wantedValue})\n\t`;
    				}
    				break;
    			case "link":
    			case "image":
    			case "coordinates":
    				output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    				break;
    		}

    		return output;
    	}

    	//Updates the query string using the defined variables
    	function updateMainQuery() {
    		$$invalidate(22, mainQuery = `SELECT ${labels.map((x, i) => labelsDisplayParity[i] ? x : "").join(" ")} ${displayWikiArticle ? "?Stránka" : ""}\n` + `WHERE {\n` + `    ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .\n` + `    ${displayWikiArticle
		? "?Stránka schema:about ?0. ?Stránka schema:isPartOf <https://en.wikipedia.org/>."
		: ""}\n` + `    ${(nameLine === null || nameLine === void 0
		? void 0
		: nameLine.wantedValue) && !thoroughFilterOption
		? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`
		: ""}\n` + `    ${queryLines.map(formatTripleAndFilter).join("")}\n` + `        \n` + `    SERVICE wikibase:label { \n` + `        bd:serviceParam wikibase:language "${labelLanguages}" .\n` + `        ${[...uniqueVariables].map((x, i) => `${x} rdfs:label ${labels[i]} .`).join("\n\t\t")}\n` + `    }\n` + `    ${labelLanguages == "cs"
		? `FILTER(LANG(${labels[0]}) = "cs")`
		: ""}\n` + `    ${validTriples.map((x, i) => GlobalVariables.queryEntityInfo[x.selectedProperty].valueType == "string"
		? (labelLanguages == "cs"
			? `FILTER(LANG(${labels[i + 1]}) = "cs")\n\t`
			: "") + (thoroughFilterOption && x.selectedValue
			? `FILTER(CONTAINS(${labels[i + 1]}, "${x.selectedValue}"))\n\t`
			: "")
		: `BIND(${[...uniqueVariables][i + 1]} AS ${labels[i + 1]})\n\t`).join("")}\n` + `}\n` + `LIMIT ${resultsLimit}\n` + `${defaultViewOption}`);

    		console.log("Main query for Iframe Display:\n" + mainQuery);
    	}

    	function getEstimatedResults() {
    		//Builds the query for the result count
    		//Although the result count isn't needed for the finalDisplay, it is queried here and just exported to OptionsScreen
    		//         resultCountQuery = `SELECT (COUNT(*) AS ?resultsNum)
    		// WHERE {
    		//     ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .
    		//     ${nameLine?.wantedValue ? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`: ""}
    		//     ${queryLines.map(formatTripleAndFilter).join("")}
    		// }`;
    		resultCountQuery = `SELECT (COUNT(*) AS ?resultsNum)
WHERE {
    ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .
    ${displayWikiArticle
		? "?Stránka schema:about ?0. ?Stránka schema:isPartOf <https://en.wikipedia.org/>."
		: ""}
    ${(nameLine === null || nameLine === void 0
		? void 0
		: nameLine.wantedValue) && !thoroughFilterOption
		? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`
		: ""}
    ${queryLines.map(formatTripleAndFilter).join("")}

    SERVICE wikibase:label {
        bd:serviceParam wikibase:language "${labelLanguages}" .
        ${[...uniqueVariables].map((x, i) => `${x} rdfs:label ${labels[i]} .`).join("\n\t\t")}
    }
    ${labelLanguages == "cs"
		? `FILTER(LANG(${labels[0]}) = "cs")`
		: ""}
    ${validTriples.map((x, i) => GlobalVariables.queryEntityInfo[x.selectedProperty].valueType == "string"
		? (labelLanguages == "cs"
			? `FILTER(LANG(${labels[i + 1]}) = "cs")\n\t`
			: "") + (thoroughFilterOption && x.selectedValue
			? `FILTER(CONTAINS(${labels[i + 1]}, "${x.selectedValue}"))\n\t`
			: "")
		: `BIND(${[...uniqueVariables][i + 1]} AS ${labels[i + 1]})\n\t`).join("")}
    
}

`;

    		$$invalidate(7, queryResultsCount = "...");
    		console.log("Query for estimated result count\n" + resultCountQuery);

    		queryDispatcher.query(resultCountQuery, "redundant").then(queryJson => {
    			if (queryJson.data == "Timeout") {
    				$$invalidate(7, queryResultsCount = "Přílíš mnoho možností na hledání");
    			} else //     throw queryJson.data
    			{
    				$$invalidate(7, queryResultsCount = queryJson.data.results.bindings[0]["resultsNum"].value); // } else if (typeof queryJson.data == "string") {
    			}
    		}).catch(err => {
    			console.log("Error for estimated result count\n" + err);
    			$$invalidate(7, queryResultsCount = "Nastala chyba při načtení");
    		});
    	}

    	function updateQueryTriples() {
    		if (!queryValidity) {
    			toggleResults();
    		} else {
    			//Gives each component in a triple the correct variable
    			for (let x = 0; x < validTriples.length; x++) {
    				let item = "";

    				//Checks if the item was already given a variable
    				for (let y = 0; y < x; y++) {
    					if (validTriples[x].selectedItem == validTriples[y].selectedItem) {
    						item = queryLines[y].item;
    						break;
    					}
    				}

    				//checks if the property (now an item) was already given a variable
    				if (!item) {
    					for (let y = 0; y < x; y++) {
    						if (validTriples[x].selectedItem == validTriples[y].selectedProperty) {
    							item = queryLines[y].value;
    							break;
    						}
    					}
    				}

    				if (!item) item = `?${x * 2}`;
    				let value = `?${x * 2 + 1}`;

    				queryLines.push({
    					item,
    					property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    					value,
    					wantedValue: validTriples[x].selectedValue
    				});
    			}

    			//Adds each variable that was created into an easy Set to iterate through later
    			for (let x of queryLines) {
    				uniqueVariables.add(x.item);
    				if (x.value[0] == "?") uniqueVariables.add(x.value);
    			}

    			//Prepares unique labels for each variable, regardless of if they will be displayed or not
    			labels.push("?" + validTriples[0].selectedItem);

    			for (let x of validTriples) {
    				labels.push(("?" + x.selectedItem + `··˃${x.selectedProperty}`).replaceAll(" ", "_").replaceAll(/[)()]/g, ""));
    			}

    			//Assures that all labels will be displayed by default
    			$$invalidate(6, labelsDisplayParity = labels.map(x => true));

    			updateMainQuery();
    			getEstimatedResults();
    		}
    	}

    	updateQueryTriples();
    	let iframeVisibilty = false;

    	function toggleIframe() {
    		$$invalidate(8, iframeVisibilty = !iframeVisibilty);
    	}

    	function toggleVariableDisplay(event) {
    		$$invalidate(6, labelsDisplayParity[event.detail.id] = event.detail.parity, labelsDisplayParity);
    		updateMainQuery();
    	}

    	function toggleLanguageOption(event) {
    		if (event.detail.parity) {
    			$$invalidate(3, labelLanguages = "cs,en,de,es,fr,it");
    		} else $$invalidate(3, labelLanguages = "cs");

    		updateMainQuery();
    		getEstimatedResults();
    	}

    	function toggleFilterOption(event) {
    		$$invalidate(5, thoroughFilterOption = event.detail.parity);
    		updateMainQuery();
    		getEstimatedResults();
    	}

    	function toggleWikiArticleOption(event) {
    		$$invalidate(4, displayWikiArticle = event.detail.parity);
    		updateMainQuery();
    		getEstimatedResults();
    	}

    	function toggleImageView(event) {
    		if (event.detail.parity) {
    			defaultViewOption = "#defaultView:ImageGrid";
    		} else defaultViewOption = "#";

    		updateMainQuery();
    	}

    	function toggleMapView(event) {
    		if (event.detail.parity) {
    			defaultViewOption = "#defaultView:Map";
    		} else defaultViewOption = "#";

    		updateMainQuery();
    	}

    	function updateResultsLimit(event) {
    		$$invalidate(0, resultsLimit = event.detail.resultsLimit);
    		updateMainQuery();
    	} // getEstimatedResults();

    	function toggleResults() {
    		dispatch("toggleResults");
    	}

    	const writable_props = ['validTriples'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<FinalDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('validTriples' in $$props) $$invalidate(21, validTriples = $$props.validTriples);
    	};

    	$$self.$capture_state = () => ({
    		GlobalVariables,
    		OptionsScreen,
    		createEventDispatcher,
    		dispatch,
    		SPARQLQueryDispatcher,
    		queryDispatcher,
    		validTriples,
    		resultsLimit,
    		viewMapOption,
    		viewImageOption,
    		defaultViewOption,
    		labelLanguages,
    		displayWikiArticle,
    		thoroughFilterOption,
    		nameLine,
    		queryValidity,
    		queryLines,
    		uniqueVariables,
    		labels,
    		labelsDisplayParity,
    		mainQuery,
    		resultCountQuery,
    		queryResultsCount,
    		iframeURL,
    		formatTripleAndFilter,
    		updateMainQuery,
    		getEstimatedResults,
    		updateQueryTriples,
    		iframeVisibilty,
    		toggleIframe,
    		toggleVariableDisplay,
    		toggleLanguageOption,
    		toggleFilterOption,
    		toggleWikiArticleOption,
    		toggleImageView,
    		toggleMapView,
    		updateResultsLimit,
    		toggleResults,
    		encodedMainQueryLink
    	});

    	$$self.$inject_state = $$props => {
    		if ('validTriples' in $$props) $$invalidate(21, validTriples = $$props.validTriples);
    		if ('resultsLimit' in $$props) $$invalidate(0, resultsLimit = $$props.resultsLimit);
    		if ('viewMapOption' in $$props) $$invalidate(1, viewMapOption = $$props.viewMapOption);
    		if ('viewImageOption' in $$props) $$invalidate(2, viewImageOption = $$props.viewImageOption);
    		if ('defaultViewOption' in $$props) defaultViewOption = $$props.defaultViewOption;
    		if ('labelLanguages' in $$props) $$invalidate(3, labelLanguages = $$props.labelLanguages);
    		if ('displayWikiArticle' in $$props) $$invalidate(4, displayWikiArticle = $$props.displayWikiArticle);
    		if ('thoroughFilterOption' in $$props) $$invalidate(5, thoroughFilterOption = $$props.thoroughFilterOption);
    		if ('nameLine' in $$props) nameLine = $$props.nameLine;
    		if ('queryValidity' in $$props) $$invalidate(10, queryValidity = $$props.queryValidity);
    		if ('queryLines' in $$props) queryLines = $$props.queryLines;
    		if ('uniqueVariables' in $$props) uniqueVariables = $$props.uniqueVariables;
    		if ('labels' in $$props) $$invalidate(11, labels = $$props.labels);
    		if ('labelsDisplayParity' in $$props) $$invalidate(6, labelsDisplayParity = $$props.labelsDisplayParity);
    		if ('mainQuery' in $$props) $$invalidate(22, mainQuery = $$props.mainQuery);
    		if ('resultCountQuery' in $$props) resultCountQuery = $$props.resultCountQuery;
    		if ('queryResultsCount' in $$props) $$invalidate(7, queryResultsCount = $$props.queryResultsCount);
    		if ('iframeVisibilty' in $$props) $$invalidate(8, iframeVisibilty = $$props.iframeVisibilty);
    		if ('encodedMainQueryLink' in $$props) $$invalidate(9, encodedMainQueryLink = $$props.encodedMainQueryLink);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*mainQuery*/ 4194304) {
    			$$invalidate(9, encodedMainQueryLink = iframeURL + encodeURIComponent(mainQuery));
    		}
    	};

    	return [
    		resultsLimit,
    		viewMapOption,
    		viewImageOption,
    		labelLanguages,
    		displayWikiArticle,
    		thoroughFilterOption,
    		labelsDisplayParity,
    		queryResultsCount,
    		iframeVisibilty,
    		encodedMainQueryLink,
    		queryValidity,
    		labels,
    		toggleIframe,
    		toggleVariableDisplay,
    		toggleLanguageOption,
    		toggleFilterOption,
    		toggleWikiArticleOption,
    		toggleImageView,
    		toggleMapView,
    		updateResultsLimit,
    		toggleResults,
    		validTriples,
    		mainQuery
    	];
    }

    class FinalDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { validTriples: 21 }, null, [-1, -1]);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "FinalDisplay",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*validTriples*/ ctx[21] === undefined && !('validTriples' in props)) {
    			console_1$1.warn("<FinalDisplay> was created without expected prop 'validTriples'");
    		}
    	}

    	get validTriples() {
    		throw new Error("<FinalDisplay>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set validTriples(value) {
    		throw new Error("<FinalDisplay>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.48.0 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    // (269:4) {:else}
    function create_else_block(ctx) {
    	let div;
    	let select;
    	let option0;
    	let option1;
    	let t2;
    	let infosign;
    	let t3;
    	let hr;
    	let t4;
    	let t5;
    	let p;
    	let t6;
    	let t7;
    	let t8;
    	let t9;
    	let t10;
    	let img;
    	let img_src_value;
    	let current;
    	let mounted;
    	let dispose;

    	infosign = new InfoSign({
    			props: {
    				text: "Mění způsob hledání příkladů u textových polí"
    			},
    			$$inline: true
    		});

    	let each_value = /*triples*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*triples*/ ctx[1][maxTriples - 1].visibility && create_if_block_2(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (!/*triples*/ ctx[1][0].selectedProperty) return create_if_block_1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			select = element("select");
    			option0 = element("option");
    			option0.textContent = "Náhodné příklady (rychlé)";
    			option1 = element("option");
    			option1.textContent = "Související príklady (pomalé)";
    			t2 = space();
    			create_component(infosign.$$.fragment);
    			t3 = space();
    			hr = element("hr");
    			t4 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			p = element("p");
    			t6 = text("Počet výsledků ve všech jazycích: ");
    			t7 = text(/*queryResults*/ ctx[0]);
    			t8 = space();
    			if (if_block0) if_block0.c();
    			t9 = space();
    			if_block1.c();
    			t10 = space();
    			img = element("img");
    			option0.selected = true;
    			option0.__value = "0";
    			option0.value = option0.__value;
    			add_location(option0, file, 271, 16, 12864);
    			option1.__value = "1";
    			option1.value = option1.__value;
    			add_location(option1, file, 272, 16, 12942);
    			attr_dev(select, "id", "searchValuesQuerySelector");
    			attr_dev(select, "class", "svelte-h68m6q");
    			add_location(select, file, 270, 12, 12766);
    			attr_dev(div, "id", "queryBuilderOptions");
    			attr_dev(div, "class", "svelte-h68m6q");
    			add_location(div, file, 269, 8, 12723);
    			set_style(hr, "border-color", "black");
    			set_style(hr, "background-color", "black");
    			set_style(hr, "border-width", "0.5px");
    			add_location(hr, file, 276, 8, 13131);
    			set_style(p, "margin-left", "8px");
    			add_location(p, file, 282, 8, 13491);
    			if (!src_url_equal(img.src, img_src_value = "https://upload.wikimedia.org/wikipedia/commons/4/41/Wikidata_Stamp_Rec_Light.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "150px");
    			attr_dev(img, "id", "wikidataStamp");
    			attr_dev(img, "alt", "Powered by Wikidata");
    			attr_dev(img, "class", "svelte-h68m6q");
    			add_location(img, file, 292, 8, 14211);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			append_dev(div, t2);
    			mount_component(infosign, div, null);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, hr, anchor);
    			insert_dev(target, t4, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t5, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			insert_dev(target, t8, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t9, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, img, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(select, "change", /*updateSearchInputValuesOption*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*triples, searchInputValuesOption, handleTripleDetailsChange*/ 74) {
    				each_value = /*triples*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t5.parentNode, t5);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (!current || dirty & /*queryResults*/ 1) set_data_dev(t7, /*queryResults*/ ctx[0]);

    			if (/*triples*/ ctx[1][maxTriples - 1].visibility) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(t9.parentNode, t9);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(t10.parentNode, t10);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(infosign.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(infosign.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(infosign);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(hr);
    			if (detaching) detach_dev(t4);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t8);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t9);
    			if_block1.d(detaching);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(img);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(269:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (267:4) {#if resultsVisibility}
    function create_if_block(ctx) {
    	let resultsdisplay;
    	let current;

    	resultsdisplay = new FinalDisplay({
    			props: {
    				validTriples: [.../*triples*/ ctx[1]].filter(func)
    			},
    			$$inline: true
    		});

    	resultsdisplay.$on("toggleResults", /*toggleResults*/ ctx[4]);

    	const block = {
    		c: function create() {
    			create_component(resultsdisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(resultsdisplay, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const resultsdisplay_changes = {};
    			if (dirty & /*triples*/ 2) resultsdisplay_changes.validTriples = [.../*triples*/ ctx[1]].filter(func);
    			resultsdisplay.$set(resultsdisplay_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(resultsdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(resultsdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(resultsdisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(267:4) {#if resultsVisibility}",
    		ctx
    	});

    	return block;
    }

    // (279:12) {#if triple.visibility}
    function create_if_block_3(ctx) {
    	let rdfstripleset;
    	let current;

    	rdfstripleset = new IndividualTripleManager({
    			props: {
    				allTriples: /*triples*/ ctx[1],
    				tripleDetails: /*triple*/ ctx[11],
    				searchInputValuesOption: /*searchInputValuesOption*/ ctx[3]
    			},
    			$$inline: true
    		});

    	rdfstripleset.$on("tripleDetailsChange", /*handleTripleDetailsChange*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(rdfstripleset.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(rdfstripleset, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const rdfstripleset_changes = {};
    			if (dirty & /*triples*/ 2) rdfstripleset_changes.allTriples = /*triples*/ ctx[1];
    			if (dirty & /*triples*/ 2) rdfstripleset_changes.tripleDetails = /*triple*/ ctx[11];
    			if (dirty & /*searchInputValuesOption*/ 8) rdfstripleset_changes.searchInputValuesOption = /*searchInputValuesOption*/ ctx[3];
    			rdfstripleset.$set(rdfstripleset_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rdfstripleset.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rdfstripleset.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(rdfstripleset, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(279:12) {#if triple.visibility}",
    		ctx
    	});

    	return block;
    }

    // (278:8) {#each triples as triple}
    function create_each_block(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*triple*/ ctx[11].visibility && create_if_block_3(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (/*triple*/ ctx[11].visibility) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*triples*/ 2) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block_3(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(278:8) {#each triples as triple}",
    		ctx
    	});

    	return block;
    }

    // (284:8) {#if triples[maxTriples-1].visibility}
    function create_if_block_2(ctx) {
    	let p0;
    	let t1;
    	let p1;

    	const block = {
    		c: function create() {
    			p0 = element("p");
    			p0.textContent = "Dosáhli jste limitu řádků!";
    			t1 = space();
    			p1 = element("p");
    			p1.textContent = "(Pravděpodobně nenajdete žádné výsledky)";
    			set_style(p0, "color", "darkred");
    			set_style(p0, "font-size", "24px");
    			set_style(p0, "margin", "8px 10px 0 10px");
    			add_location(p0, file, 284, 12, 13631);
    			set_style(p1, "padding-left", "8px");
    			set_style(p1, "margin", "0");
    			add_location(p1, file, 285, 12, 13740);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(284:8) {#if triples[maxTriples-1].visibility}",
    		ctx
    	});

    	return block;
    }

    // (290:8) {:else}
    function create_else_block_1(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			t = text("Zobrazit");
    			if (!src_url_equal(img.src, img_src_value = "./display.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "20px");
    			attr_dev(img, "height", "15px");
    			attr_dev(img, "alt", "");
    			add_location(img, file, 290, 64, 14112);
    			attr_dev(button, "id", "displayButton");
    			attr_dev(button, "class", "svelte-h68m6q");
    			add_location(button, file, 290, 12, 14060);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleResults*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(290:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (288:8) {#if !triples[0].selectedProperty}
    function create_if_block_1(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let t;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			img = element("img");
    			t = text("Zobrazit");
    			if (!src_url_equal(img.src, img_src_value = "./display.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "width", "20px");
    			attr_dev(img, "height", "15px");
    			attr_dev(img, "alt", "");
    			add_location(img, file, 288, 73, 13955);
    			attr_dev(button, "id", "displayButton");
    			button.disabled = true;
    			attr_dev(button, "class", "svelte-h68m6q");
    			add_location(button, file, 288, 12, 13894);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*toggleResults*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(288:8) {#if !triples[0].selectedProperty}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*resultsVisibility*/ ctx[2]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			if_block.c();
    			attr_dev(main, "class", "svelte-h68m6q");
    			add_location(main, file, 265, 0, 12533);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const maxTriples = 8;
    const func = x => x.selectedProperty;

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let queryResults = 0;
    	let triples = [];

    	for (let x = 0; x < maxTriples; x++) {
    		triples.push({
    			"tripleID": x,
    			"visibility": false,
    			"items": [],
    			"selectedItem": "",
    			"selectedProperty": "",
    			"selectedNumberInterval": "Méně než",
    			"selectedTimePeriod": "Před",
    			"selectedTimePrecision": "Rok",
    			"selectedValue": ""
    		});
    	} // Default values are pushed for all possibilities to simplify default selectors for each input box 

    	triples[0].items = GlobalVariables.queryItemVariables;
    	triples[0].visibility = true;
    	let resultsVisibility = false;

    	function toggleResults() {
    		$$invalidate(2, resultsVisibility = !resultsVisibility);
    	}

    	let searchInputValuesOption;

    	//Put into it's own function to avoid a red squiggly line saying that .srcElement is deprecated and .value doesn't exist on element Event
    	function updateSearchInputValuesOption(event) {
    		$$invalidate(3, searchInputValuesOption = +event.srcElement.value);
    	}

    	//Updates the options for the first select box in a triple
    	function updatePossibleItemsForTriples() {
    		$$invalidate(1, triples[0].items = GlobalVariables.queryItemVariables, triples);

    		if (triples[0].items.indexOf(triples[0].selectedItem) < 0) {
    			$$invalidate(1, triples[0].selectedItem = "", triples);
    			$$invalidate(1, triples[0].selectedProperty = "", triples);
    		}

    		let possibleItems = new Set();

    		for (let x = 0; x < maxTriples - 1; x++) {
    			if (triples[x].selectedItem) possibleItems.add(triples[x].selectedItem);

    			//Used to get rid of the option to used wanted values as items
    			// if (!triples[x].selectedValue && triples[x].selectedProperty) {
    			if (triples[x].selectedProperty) {
    				if (GlobalVariables.queryEntityProperties.hasOwnProperty(triples[x].selectedProperty)) {
    					possibleItems.add(triples[x].selectedProperty);
    				}
    			}

    			$$invalidate(1, triples[x + 1].items = [...possibleItems], triples);

    			if (!GlobalVariables.queryItemVariables.includes(triples[x + 1].selectedItem) && triples[x + 1].items.indexOf(triples[x + 1].selectedItem) < 0) {
    				$$invalidate(1, triples[x + 1].selectedItem = "", triples);
    				$$invalidate(1, triples[x + 1].selectedProperty = "", triples);
    			}
    		}
    	}

    	//This is called whenever anything in a triple is changed
    	//It updates the visibility of each triples and calls updatePossibleItemsForTriples()
    	function handleTripleDetailsChange(event) {
    		let currentID = triples.map(x => x.tripleID).indexOf(event.detail.tripleID);
    		$$invalidate(1, triples[currentID] = event.detail, triples);

    		if (!triples[currentID].selectedItem && !triples[currentID].selectedProperty) {
    			$$invalidate(1, triples[currentID].visibility = false, triples);
    		}

    		triples.sort((a, b) => +b.visibility - +a.visibility);
    		$$invalidate(1, triples[0].items = GlobalVariables.queryItemVariables, triples);
    		$$invalidate(1, triples[0].visibility = true, triples);

    		// Has to be its own if statement, to ensure that another triple will be visible
    		let lastVisible = triples.map(x => x.visibility).lastIndexOf(true);

    		if (triples[lastVisible].selectedProperty) {
    			if (lastVisible < maxTriples - 1) {
    				$$invalidate(1, triples[lastVisible + 1].visibility = true, triples);
    			}
    		}

    		triples.sort((a, b) => +b.visibility - +a.visibility);

    		//Ensures that all empty triples are gone
    		for (let x = 0; x <= lastVisible; x++) {
    			updatePossibleItemsForTriples();
    			lastVisible = triples.map(x => x.visibility).lastIndexOf(true);

    			for (let x in triples) {
    				if (triples[x].visibility && !triples[x].selectedItem && +x != lastVisible) {
    					$$invalidate(1, triples[x].visibility = false, triples);
    				}
    			}

    			triples.sort((a, b) => +b.visibility - +a.visibility);
    			$$invalidate(1, triples[0].items = GlobalVariables.queryItemVariables, triples);
    		}
    	}

    	let lastResultQueryID = +new Date(); //Ensures that the last query sent will be the one displayed
    	let lastResultQuery; //Ensures that the same query isn't being sent every 5 seconds
    	setInterval(resultsCounter, 5000);

    	//A function which creates and calls a query which will return the number of results
    	function resultsCounter() {
    		const queryDispatcher = new SPARQLQueryDispatcher('https://query.wikidata.org/sparql');
    		let validTriples = [...triples].filter(x => x.selectedProperty);
    		let nameLine;

    		//A check for a custom property
    		for (let x = validTriples.length - 1; x > -1; x--) {
    			if (validTriples[x].selectedProperty == "Jméno" || validTriples[x].selectedProperty == "Název") {
    				nameLine = {
    					item: "?0",
    					property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    					value: "",
    					wantedValue: validTriples[x].selectedValue
    				};

    				validTriples.splice(x, 1);
    			}
    		}

    		let queryLines = [];
    		let uniqueVariables = new Set();
    		let resultCountQuery;
    		let queryValidity = validTriples.length != 0;

    		if (queryValidity) {
    			for (let x = 0; x < validTriples.length; x++) {
    				let item = "";

    				for (let y = 0; y < x; y++) {
    					if (validTriples[x].selectedItem == validTriples[y].selectedItem) {
    						item = queryLines[y].item;
    						break;
    					}
    				}

    				if (!item) {
    					for (let y = 0; y < x; y++) {
    						if (validTriples[x].selectedItem == validTriples[y].selectedProperty) {
    							item = queryLines[y].value;
    							break;
    						}
    					}
    				}

    				if (!item) item = `?${x * 2}`;
    				let value = `?${x * 2 + 1}`;

    				queryLines.push({
    					item,
    					property: GlobalVariables.queryEntityInfo[validTriples[x].selectedProperty].id,
    					value,
    					wantedValue: validTriples[x].selectedValue
    				});
    			}

    			for (let x of queryLines) {
    				uniqueVariables.add(x.item);
    				if (x.value[0] == "?") uniqueVariables.add(x.value);
    			}

    			function formatTripleAndFilter(queryLine, lineIndex) {
    				let output = "";

    				switch (GlobalVariables.queryEntityInfo[validTriples[lineIndex].selectedProperty].valueType) {
    					case "string":
    						output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    						if (queryLine.wantedValue != "") output += `${queryLine.value} rdfs:label "${queryLine.wantedValue}"@cs .\n\t`;
    						break;
    					case "date":
    						output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    						if (queryLine.wantedValue != "") {
    							if (validTriples[lineIndex].selectedTimePeriod == "Přesně") {
    								switch (validTriples[lineIndex].selectedTimePrecision) {
    									case "Den":
    										output += `FILTER(DAY(${queryLine.value}) = DAY("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    									case "Měsíc":
    										output += `FILTER(MONTH(${queryLine.value}) =  MONTH("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    									case "Rok":
    										output += `FILTER(YEAR(${queryLine.value}) = YEAR("${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime))\n\t`;
    								}
    							} else {
    								let periodIntervalSymbol = ({ "Po": ">", "Před": "<" })[validTriples[lineIndex].selectedTimePeriod];

    								switch (validTriples[lineIndex].selectedTimePrecision) {
    									case "Rok":
    										output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 4)}-01-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    										break;
    									case "Měsíc":
    										output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue.slice(0, 7)}-01T00:00:00Z"^^xsd:dateTime)\n\t`;
    										break;
    									case "Den":
    										output += `FILTER(${queryLine.value} ${periodIntervalSymbol} "${queryLine.wantedValue}T00:00:00Z"^^xsd:dateTime)\n\t`;
    								}
    							}
    						}
    						break;
    					case "number":
    						output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .`;
    						if (queryLine.wantedValue != "") {
    							let intervalSymbol = ({
    								"Méně nebo rovno": "<=",
    								"Méně než": "<",
    								"Více nebo rovno": ">=",
    								"Více než": ">",
    								"Rovno": "="
    							})[validTriples[lineIndex].selectedNumberInterval];

    							output += `FILTER(${queryLine.value} ${intervalSymbol} ${queryLine.wantedValue})\n\t`;
    						}
    						break;
    					case "link":
    					case "image":
    					case "coordinates":
    						output += `${queryLine.item} ${queryLine.property} ${queryLine.value} .\n\t`;
    						break;
    				}

    				return output;
    			}

    			resultCountQuery = `SELECT (COUNT(*) AS ?resultsNum)\n` + `WHERE {\n` + `    ${[...uniqueVariables][0]} wdt:P31 ${GlobalVariables.queryEntityInfo[validTriples[0].selectedItem].id} .\n` + `    ${(nameLine === null || nameLine === void 0
			? void 0
			: nameLine.wantedValue)
			? `${nameLine.item} ${nameLine.property} "${nameLine.wantedValue}"@cs .`
			: ""}\n` + `    ${queryLines.map(formatTripleAndFilter).join("")}\n` + `}`;

    			let now = +new Date();

    			if (resultCountQuery != lastResultQuery) {
    				lastResultQueryID = now;
    				lastResultQuery = resultCountQuery;
    				$$invalidate(0, queryResults = "...");
    				console.log("Query for estimated result count: (id)" + lastResultQueryID + "\n" + resultCountQuery);

    				queryDispatcher.query(resultCountQuery, now).then(queryJson => {
    					// console.log ("\n\n\n=================\n\n\n", queryJson.queryID, "\n", lastResultQuery.toString(), "\n\n", queryJson.data.results.bindings[0]["resultsNum"].value)
    					if (queryJson.queryID == lastResultQueryID.toString()) {
    						if (queryJson.data == "Timeout") {
    							$$invalidate(0, queryResults = "Přílíš mnoho možností na hledání"); // Buď žádný nebo velmi mnoho
    						} else //     throw queryJson.data;
    						{
    							$$invalidate(0, queryResults = queryJson.data.results.bindings[0]["resultsNum"].value); // } else if (typeof queryJson.data == "string") {
    						}
    					}
    				}).catch(err => {
    					console.log("Error for estimated result count\n" + err);
    					$$invalidate(0, queryResults = "Nastala zvláštní chyba při načtení");
    				});
    			}
    		}
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		RDFSTripleSet: IndividualTripleManager,
    		ResultsDisplay: FinalDisplay,
    		GlobalVariables,
    		InfoSign,
    		queryResults,
    		triples,
    		maxTriples,
    		resultsVisibility,
    		toggleResults,
    		searchInputValuesOption,
    		updateSearchInputValuesOption,
    		updatePossibleItemsForTriples,
    		handleTripleDetailsChange,
    		SPARQLQueryDispatcher,
    		lastResultQueryID,
    		lastResultQuery,
    		resultsCounter
    	});

    	$$self.$inject_state = $$props => {
    		if ('queryResults' in $$props) $$invalidate(0, queryResults = $$props.queryResults);
    		if ('triples' in $$props) $$invalidate(1, triples = $$props.triples);
    		if ('resultsVisibility' in $$props) $$invalidate(2, resultsVisibility = $$props.resultsVisibility);
    		if ('searchInputValuesOption' in $$props) $$invalidate(3, searchInputValuesOption = $$props.searchInputValuesOption);
    		if ('lastResultQueryID' in $$props) lastResultQueryID = $$props.lastResultQueryID;
    		if ('lastResultQuery' in $$props) lastResultQuery = $$props.lastResultQuery;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		queryResults,
    		triples,
    		resultsVisibility,
    		searchInputValuesOption,
    		toggleResults,
    		updateSearchInputValuesOption,
    		handleTripleDetailsChange
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    var app = new App({
        target: document.body
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
