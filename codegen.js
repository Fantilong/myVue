function generate(ast) {
    const code = genElement(ast)
    return {
        render: `with(this){return ${code}}`
    }
}

function genElement(el) {
    const children = genChildren(el)
    let code = `_c('${el.tag}', {}, ${children})`
    return code
}

function genChildren(el) {
    if (el.children.length) {
        return '[' + el.children.map(child => genNode(child)).join(',') + ']'
    }
}

function genNode(node) {
    if (node.type === 1) {
        return genElement(node)
    } else {
        return genText(node)
    }
}

function genText(text) {
    return `_v(${text.type === 2 ? text.expression : JSON.stringify(text.text)})`
}