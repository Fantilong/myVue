// 设置观察者
function observe(data) {
    let type = Object.prototype.toString.call(data)
    if (type !== '[object Object]' && type !== '[object Array]') return
    if (data.__ob__) return data.__ob__

    return new Observer(data)
}
// this.data.person
// data person data['person'] , 返回一个 Observer 实例，且person 中携带该实例
function defineReactive(obj, key, val) {
    let childOb = observe(obj[key])
    // debugger
    let dep = new Dep() // 声明订阅者收集容器

    Object.defineProperty(obj, key, {
        configurable: true,
        enumerable: true,
        get: function proxyGetter() {
            // console.log('劫持 this._data[keys[i]] 的访问', key);
            if (Dep.target) {
                dep.depend() // 当获取该属性时，订阅者类上有订阅者，则将其收集在该属性的订阅者收集容器中
                if (childOb) childOb.dep.depend()
            }
            return val
        },
        set: function proxySetter(newVal) {
            if (val === newVal) return
            dep.notify()
            val = newVal
        },
    })
}

class Dep {
    constructor() {
        this.subs = [] // 订阅者容器
    }
    addSub(watcher) {
        this.subs.push(watcher)
    }
    depend() {
        if (Dep.target) { // 收集订阅者
            Dep.target.addDep(this)
            // this.subs.push(Dep.target)
        }
    }
    notify() {
        this.subs.forEach(watcher => watcher.update())
        // this.subs.forEach(watcher => watcher.run())
    }
}
class Observer {
    constructor(data) {
        this.dep = new Dep()
        if (Array.isArray(data)) {
            data.__proto__ = arrayMethods
            this.observeArray(data)
        } else {
            this.walk(data)
        }
        // debugger
        Object.defineProperty(data, '__ob__', {
            enumerable: false,
            configurable: false,
            value: this,
            writable: true
        })
    }
    walk(data) {
        let keys = Object.keys(data)
        for (let i = 0; i < keys.length; i++) {
            defineReactive(data, keys[i], data[keys[i]])
        }
    }
    observeArray(arr) {
        for (let i = 0; i < arr.length; i++) {
            observe(arr[i])
        }
    }
}


const metationMethods = ['push', 'pop', 'shift']
const arrayMethods = Object.create(Array.prototype)
const arrayProto = Array.prototype

metationMethods.forEach(method => {
    if (method === 'push') (this.__ob__ && this.__ob__.observeArray(args))

    arrayMethods[method] = function (...args) {
        const result = arrayProto[method].apply(this, args)
        this.__ob__.dep.notify()
        return result
    }
})


let watcherQueue = []
let watcherId = 0
let targetStack = []
class Watcher {
    constructor(vm, exp, cb, options = {}) {
        this.dirty = this.lazy = !!options.lazy
        this.vm = vm
        this.exp = exp
        this.cb = cb
        // this.get()
        this.id = ++watcherId // 每个 watcher 实例的 id 都是 1
        this.deps = []
        if (!this.lazy) this.get()
    }
    addDep(dep) {
        if (this.deps.indexOf(dep) !== -1) return
        this.deps.push(dep)
        dep.addSub(this)
    }
    get() {
        Dep.target = this
        targetStack.push(this)
        if (typeof this.exp === 'function') {
            this.value = this.exp.call(this.vm)
        } else {
            this.vm[this.exp] // 获取一下属性值，收集订阅
        }
        targetStack.pop()
        Dep.target = targetStack.length ? targetStack[targetStack.length - 1] : null // 收集完成后，清除
    }
    update() {
        if (this.lazy) {
            this.dirty = true
        } else {
            this.run()
        }
    }
    run() {
        // 只处理第一次赋值的notify
        if (watcherQueue.indexOf(this.id) !== -1) return
        // debugger

        watcherQueue.push(this.id)
        // let index = watcherQueue.length - 1

        // 异步执行, 等属性赋值完成后执行
        Promise.resolve().then(() => {
            this.get()
            this.cb.call(this.vm)
            // 清空队列，实际上这里也只收集了一个watcher实例
            let index = watcherQueue.indexOf(this.id)
            watcherQueue.splice(index, 1)
        })
    }
}

class Myvue {
    constructor(options) {
        this.$options = options // 存储初始化配置，$options 用于暴露出去的配置属性
        this.initData()
        this.initComputed()
        this.initWatch()
    }
    initData() {
        let data = this._data = this.$options.data // _data 声明 用于给内部使用, 常用 _ 开头
        let keys = Object.keys(data)

        // 实现this.XXX 可以访问到 data 中的数据，方式是通过 Object.definProperty 定义指向真实访问方式的属性
        for (let i = 0; i < keys.length; i++) {
            Object.defineProperty(this, keys[i], {
                configurable: true,
                enumerable: true,
                get: function proxyGetter() {
                    // console.log('劫持 this 访问');
                    return this._data[keys[i]]
                },
                set: function proxySetter(value) {
                    this._data[keys[i]] = value
                },
            })
        }
        observe(data)
    }
    initComputed() {
        let computed = this.$options.computed
        if (!computed) return

        let keys = Object.keys(computed)
        for (let i = 0; i < keys.length; i++) {
            // 计算属性 本质上还是一个监听器，鉴定的是计算属性的计算函数当中的使用到的属性，监听到的属性发生变化，则，重新执行该函数
            const watcher = new Watcher(this, computed[keys[i]], function () { }, { lazy: true })
            Object.defineProperty(this, keys[i], {
                enumerable: true,
                configurable: true,
                get: function computedGetter() {
                    if (watcher.dirty) {
                        watcher.get()
                        watcher.dirty = false
                    }

                    if (Dep.target) {
                        watcher.deps.forEach((dep) => dep.depend())
                    }

                    return watcher.value
                },
                set: function computedSetter() {
                    console.warn('请不要对计算属性赋值')
                }
            })

        }
    }
    initWatch() {
        let watch = this.$options.watch
        if (!watch) return
        let keys = Object.keys(watch)
        for (let i = 0; i < keys.length; i++) {
            new Watcher(this, keys[i], watch[keys[i]])
            // this.$watch(keys[i], watch[keys[i]])
        }
    }
    $watch(exp, cb) {
        new Watcher(this, exp, cb)
    }
    $set(target, key, value) {
        let ob = target.__ob__
        defineReactive(target, key, value)
        ob.dep.notify()

        // this.person, name, {a: 1}
    }
}