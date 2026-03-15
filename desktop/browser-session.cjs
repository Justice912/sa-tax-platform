async function prepareBrowserSession(session) {
  await session.clearCache();
  await session.clearStorageData({
    storages: ["serviceworkers", "cachestorage", "shadercache"],
  });
}

module.exports = {
  prepareBrowserSession,
};
