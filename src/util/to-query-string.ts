export const toQueryString = (obj: { [index: string]: string | undefined }): string => Object.keys(obj)
  .filter(key => obj[key]) // Filter out undefined values
  .reduce((queryString, key, i) => {
    let delimiter, value
    delimiter = (i === 0) ? '?' : '&'
    key = encodeURIComponent(key)
    value = encodeURIComponent(`${obj[key]}`)
    return [queryString, delimiter, key, '=', value].join('')
  }, '')
