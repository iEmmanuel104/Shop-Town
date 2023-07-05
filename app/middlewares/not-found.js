const notFound = (req, res) => res.status(404).json({
    error: 'true', message: 'Route does not exist' })

module.exports = notFound
                                                                                                                                                                                                                                                                                                                                                