/**
 * Created by rule on 2019/2/24.
 */
const fs = require('fs');
const path = require('path');
const Mock = require('mockjs');
const {Random, mock} = Mock;
const category = [...Array(20)].map(i => mock({
  categoryGuid: mock('@guid'),
  categoryName: mock('@csentence(3,5)'),
  goodsCount: mock('@integer(3,9)')
}));


const goodsList = category.map(it => [...Array(it.goodsCount)].map(i => mock({
  categoryGuid: it.categoryGuid,
  goodsName: mock('@csentence(5,9)'),
  goodsImage: Random.image('100x100', Random.color()),
  goodsItemGuid: mock('@guid'),
  goodsPrice: mock('@float(60, 100, 2, 2)'),
  sellCount: mock('@integer(3,70)')
})));

fs.writeFile(path.join(__dirname, 'mock.json'), JSON.stringify({
  category,
  goodsList: goodsList.reduce((p, l) => [...p, ...l], [])
}), (err, res) => {
  if (err) throw err
  console.log('write over');
});
