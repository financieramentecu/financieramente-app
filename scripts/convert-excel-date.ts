function excelDateToJSDate(serial: number) {
    const excelEpoch = new Date(1900, 0, 1)
    return new Date(excelEpoch.getTime() + (serial - 2) * 24 * 60 * 60 * 1000)
}

console.log('46174:', excelDateToJSDate(46174).toISOString())
console.log('46203:', excelDateToJSDate(46203).toISOString())
