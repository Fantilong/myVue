function parser(html) {
    let stack = []
    let root
    let currentParent
    while (html) {
        let ltIndex = html.indexOf('<')
        if (ltIndex > 0) { //前面有文本
            //type 1-元素节点  2-带变量的文本节点  3-纯文本节点
            let text = html.slice(0, ltIndex)
            const element = parseText(text)
            element.parent = currentParent
            currentParent.children.push(element)
            html = html.slice(ltIndex)
        } else if (html[ltIndex + 1] !== '/') { //前面没有文本，且是开始标签
            let gtIndex = html.indexOf('>')
            const element = {
                type: 1,
                tag: html.slice(ltIndex + 1, gtIndex), //不考虑dom的任何属性
                parent: currentParent,
                children: [],
            }

            if (!root) {
                root = element
            } else {
                currentParent.children.push(element)
            }
            stack.push(element)
            currentParent = element
            html = html.slice(gtIndex + 1)
        } else { //结束标签
            let gtIndex = html.indexOf('>')
            stack.pop()
            currentParent = stack[stack.length - 1]
            html = html.slice(gtIndex + 1)
        }
    }
    return root
}

function parseText(text) {
    let originText = text
    let tokens = []
    let type = 3
    while (text) {
        let start = text.indexOf('{{')
        let end = text.indexOf('}}')
        if (start !== -1 && end !== -1) {
            type = 2
            if (start > 0) {
                tokens.push(JSON.stringify(text.slice(0, start)))
            }
            let exp = text.slice(start + 2, end)
            tokens.push(`_s(${exp})`)
            text = text.slice(end + 2)
        } else {
            tokens.push(JSON.stringify(text))
            text = ''
        }
    }
    let element = {
        type,
        text: originText,
    }
    type === 2 ? element.expression = tokens.join('+') : ''

    return element
}