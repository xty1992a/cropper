let elementStyle = document.createElement('div').style

let vendor = (() => {
  let transformNames = {
	webkit: 'webkitTransform',
	Moz: 'MozTransform',
	O: 'OTransform',
	ms: 'msTransform',
	standard: 'transform',
  }

  for (let key in transformNames) {
	if (elementStyle[transformNames[key]] !== undefined) {
	  return key
	}
  }

  return false
})()

export function prefixStyle(style) {
  if (vendor === false) {
	return false
  }

  if (vendor === 'standard') {
	if (style === 'transitionEnd') {
	  return 'transitionend'
	}
	return style
  }

  return vendor + style.charAt(0).toUpperCase() + style.substr(1)
}

export function getParentByClassName(el, className, stop = document.body) {
  if (el.classList.contains(className)) return el
  let parent = el.parentNode
  let target = null
  while (parent) {
	if (parent.classList.contains(className)) {
	  target = parent
	  parent = null
	}
	else {
	  parent = parent.parentNode
	  if (parent === stop) {
		parent = null
	  }
	}
  }
  return target
}

export function css(el, style) {
  Object.keys(style).forEach(k => {
	let val = style[k]
	if (['transform', 'transition'].includes(k)) {
	  k = prefixStyle(k)
	}
	el.style[k] = val
  })
}

export const isMobile = (() => {
  var userAgentInfo = navigator.userAgent;
  var Agents = ['Android', 'iPhone', 'SymbianOS', 'Windows Phone', 'iPad', 'iPod']
  var flag = true;
  for (var v = 0; v < Agents.length; v++) {
	if (userAgentInfo.indexOf(Agents[v]) > 0) {
	  flag = false;
	  break;
	}
  }
  return !flag;
})()
