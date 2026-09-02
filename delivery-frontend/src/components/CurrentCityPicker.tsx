import { SearchOutlined } from '@ant-design/icons';
import { Input, Modal, message } from 'antd';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import pcCode from 'china-division/dist/pc-code.json';
import styles from '@/styles/zhenke.less';
import {
  CURRENT_LOCATION_CHANGED_EVENT,
  currentLocationCityLabel,
  ensureCurrentLocation,
  loadCurrentLocation,
  notifyCurrentLocationChanged,
  saveCurrentLocation,
} from '@/utils/currentLocation';

type LocationStatus = 'idle' | 'locating' | 'located' | 'failed';
type RegionNode = { code: string; name: string; children?: RegionNode[] };
type CityOption = { code: string; name: string; province: string };

const PROVINCE_AS_CITY = new Set(['11', '12', '31', '50', '71', '81', '82']);
const HOT_CITY_NAMES = ['北京市', '上海市', '广州市', '深圳市', '杭州市', '成都市', '重庆市', '天津市', '南京市', '武汉市', '西安市', '苏州市'];

const cityGroups = (pcCode as RegionNode[]).map((province) => {
  let cities: CityOption[];
  if (PROVINCE_AS_CITY.has(province.code)) {
    cities = [{ code: province.code, name: province.name, province: province.name }];
  } else {
    cities = (province.children ?? []).flatMap((city) => {
      if (/直辖县级行政区划/.test(city.name)) {
        return (city.children ?? []).map((area) => ({
          code: area.code,
          name: area.name,
          province: province.name,
        }));
      }
      return [{ code: city.code, name: city.name, province: province.name }];
    });
  }
  return { province: province.name, cities };
}).filter((group) => group.cities.length > 0);

const allCities = cityGroups.flatMap((group) => group.cities);
const hotCities = HOT_CITY_NAMES
  .map((name) => allCities.find((city) => city.name === name))
  .filter((city): city is CityOption => Boolean(city));

export default function CurrentCityPicker({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const initialLocation = loadCurrentLocation();
  const [locationStatus, setLocationStatus] = useState<LocationStatus>(
    initialLocation ? 'located' : 'idle',
  );
  const [locationError, setLocationError] = useState('');
  const [currentArea, setCurrentArea] = useState(() => currentLocationCityLabel(initialLocation));
  const [citySearch, setCitySearch] = useState('');
  const locationRequestVersion = useRef(0);

  const citySearchResults = useMemo(() => {
    const keyword = citySearch.trim();
    if (!keyword) return [];
    return allCities.filter((city) => {
      const shortName = city.name.replace(/(市|地区|自治州|盟)$/, '');
      return city.name.includes(keyword)
        || shortName.includes(keyword)
        || city.province.includes(keyword);
    }).slice(0, 80);
  }, [citySearch]);

  const close = useCallback(() => {
    locationRequestVersion.current += 1;
    setCitySearch('');
    onClose();
  }, [onClose]);

  const locate = useCallback((force = false) => {
    const requestVersion = ++locationRequestVersion.current;
    setLocationError('');
    setLocationStatus('locating');
    void ensureCurrentLocation({ force })
      .then((resolved) => {
        if (requestVersion !== locationRequestVersion.current) return;
        setCurrentArea(currentLocationCityLabel(resolved));
        setLocationStatus('located');
        setLocationError('');
        setCitySearch('');
        onClose();
      })
      .catch((reason) => {
        if (requestVersion !== locationRequestVersion.current) return;
        setLocationStatus('failed');
        setLocationError(reason instanceof Error
          ? reason.message
          : '设备定位暂时不可用，请手动选择城市');
      });
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const resolved = loadCurrentLocation();
    setCurrentArea(currentLocationCityLabel(resolved));
    setLocationStatus(resolved ? 'located' : 'idle');
    setLocationError('');
  }, [open]);

  useEffect(() => {
    const refreshLocation = () => {
      const resolved = loadCurrentLocation();
      if (!resolved) return;
      setCurrentArea(currentLocationCityLabel(resolved));
      setLocationStatus('located');
      setLocationError('');
    };
    window.addEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshLocation);
    return () => window.removeEventListener(CURRENT_LOCATION_CHANGED_EVENT, refreshLocation);
  }, []);

  useEffect(() => () => {
    locationRequestVersion.current += 1;
  }, []);

  const selectCity = (city: CityOption) => {
    locationRequestVersion.current += 1;
    const saved = saveCurrentLocation({ label: city.name, city: city.name, source: 'MANUAL' });
    if (!saved) {
      setLocationStatus('failed');
      setLocationError('当前城市暂时无法保存，请稍后重试');
      return;
    }
    setCurrentArea(city.name);
    setLocationStatus('located');
    setLocationError('');
    setCitySearch('');
    notifyCurrentLocationChanged();
    onClose();
    message.success('当前城市已更新');
  };

  return (
    <Modal
      open={open}
      title="选择当前城市"
      footer={null}
      width={720}
      rootClassName={styles.cityPickerModal}
      onCancel={close}
      destroyOnHidden
    >
      <Input
        size="large"
        allowClear
        prefix={<SearchOutlined />}
        value={citySearch}
        placeholder="搜索城市名称"
        aria-label="搜索城市名称"
        onChange={(event) => setCitySearch(event.target.value)}
      />
      <div className={styles.cityPickerScroll}>
        {citySearch.trim() ? (
          <section className={styles.cityPickerSection}>
            <h3>搜索结果</h3>
            {citySearchResults.length > 0 ? (
              <div className={styles.citySearchResults}>
                {citySearchResults.map((city) => (
                  <button type="button" key={city.code} onClick={() => selectCity(city)}>
                    <strong>{city.name}</strong>
                    {city.province !== city.name ? <small>{city.province}</small> : null}
                  </button>
                ))}
              </div>
            ) : <p className={styles.cityPickerEmpty}>没有找到这个城市，请换个名称搜索。</p>}
          </section>
        ) : (
          <>
            <section className={styles.cityPickerSection}>
              <h3>定位 / 当前城市</h3>
              <button
                type="button"
                className={styles.cityCurrentButton}
                onClick={() => locate(true)}
                disabled={locationStatus === 'locating'}
              >
                <strong>{locationStatus === 'locating' ? '正在定位…' : currentArea}</strong>
                <small>{locationStatus === 'locating' ? '请稍候' : '点击重新定位'}</small>
              </button>
              {locationError && <p className={styles.cityLocationError}>{locationError}</p>}
            </section>
            <section className={styles.cityPickerSection}>
              <h3>热门城市</h3>
              <div className={styles.hotCityGrid}>
                {hotCities.map((city) => (
                  <button type="button" key={city.code} onClick={() => selectCity(city)}>
                    {city.name.replace(/市$/, '')}
                  </button>
                ))}
              </div>
            </section>
            <section className={styles.cityPickerSection}>
              <h3>按省份选择</h3>
              <div className={styles.cityProvinceList}>
                {cityGroups.map((group) => (
                  <section key={group.province}>
                    <h4>{group.province}</h4>
                    <div>
                      {group.cities.map((city) => (
                        <button type="button" key={city.code} onClick={() => selectCity(city)}>
                          {city.name}
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </Modal>
  );
}
