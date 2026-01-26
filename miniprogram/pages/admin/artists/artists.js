// pages/admin/artists/artists.js
const api = require('../../../utils/api');
const { showToast, showModal, showLoading, hideLoading } = require('../../../utils/util');

Page({
  data: {
    artists: [],
    loading: false,
    showAddModal: false,
    editingArtist: null,
    formData: {
      name: '',
      alias: '',
      avatar: ''
    }
  },

  onLoad() {
    this.loadArtists();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadArtists().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  // 加载艺人列表
  async loadArtists() {
    this.setData({ loading: true });

    try {
      const result = await api.getArtists({ pageSize: 100 });
      this.setData({ artists: result.list || [] });
    } catch (err) {
      console.error('加载失败:', err);
      showToast('加载失败');
    } finally {
      this.setData({ loading: false });
    }
  },

  // 打开新增弹窗
  onShowAddModal() {
    this.setData({
      showAddModal: true,
      editingArtist: null,
      formData: { name: '', alias: '', avatar: '' }
    });
  },

  // 打开编辑弹窗
  onEditArtist(e) {
    const { artist } = e.currentTarget.dataset;
    this.setData({
      showAddModal: true,
      editingArtist: artist,
      formData: {
        name: artist.name || '',
        alias: (artist.alias || []).join('、'),
        avatar: artist.avatar || ''
      }
    });
  },

  // 关闭弹窗
  onCloseModal() {
    this.setData({
      showAddModal: false,
      editingArtist: null,
      formData: { name: '', alias: '', avatar: '' }
    });
  },

  // 输入艺人名称
  onInputName(e) {
    this.setData({ 'formData.name': e.detail.value });
  },

  // 输入别名
  onInputAlias(e) {
    this.setData({ 'formData.alias': e.detail.value });
  },

  // 选择头像
  async onChooseAvatar() {
    try {
      const fileID = await api.chooseAndUploadImage('avatar');
      this.setData({ 'formData.avatar': fileID });
      showToast('上传成功');
    } catch (err) {
      console.error('上传失败:', err);
      if (err.errMsg !== 'chooseImage:fail cancel') {
        showToast('上传失败');
      }
    }
  },

  // 保存艺人
  async onSaveArtist() {
    const { formData, editingArtist } = this.data;

    if (!formData.name.trim()) {
      showToast('请输入艺人名称');
      return;
    }

    showLoading('保存中...');

    try {
      const artistData = {
        _id: editingArtist ? editingArtist._id : undefined,
        name: formData.name.trim(),
        alias: formData.alias ? formData.alias.split(/[,，、]/).map(s => s.trim()).filter(Boolean) : [],
        avatar: formData.avatar
      };

      await api.saveArtist(artistData);
      showToast(editingArtist ? '修改成功' : '添加成功');
      this.onCloseModal();
      this.loadArtists();
    } catch (err) {
      console.error('保存失败:', err);
      showToast('保存失败');
    } finally {
      hideLoading();
    }
  },

  // 删除艺人
  async onDeleteArtist(e) {
    const { id, name } = e.currentTarget.dataset;

    const res = await showModal({
      title: '确认删除',
      content: `确定要删除艺人"${name}"吗？`
    });

    if (!res.confirm) return;

    try {
      await api.deleteArtist(id);
      showToast('删除成功');
      this.loadArtists();
    } catch (err) {
      console.error('删除失败:', err);
      showToast('删除失败');
    }
  },

  // 阻止冒泡
  onStopPropagation() {
    // 空函数，用于阻止事件冒泡
  }
});
