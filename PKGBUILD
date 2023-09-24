pkgname=scroll
pkgver=0.1.8
pkgrel=1
pkgdesc="Backup system based on restic"
arch=('any')
license=('MIT')
depends=('bash' 'coreutils' 'grep' 'restic' 'yq')
source=(
  $pkgname
  ${pkgname}.yaml
  key
  ${pkgname}-backup.service
  ${pkgname}-backup.timer
  ${pkgname}-trim.service
  ${pkgname}-trim.timer
)
md5sums=('df90edab46fd524f775f06c9e404c39d'
         '5bb2eeeab6eda06837cff1e25d371af7'
         'd41d8cd98f00b204e9800998ecf8427e'
         '319cb73f4567bf22d3ba3d0395fa876c'
         'a4264661c48b61ba3c61452545ba73b6'
         '494ae5a316ff9fbf4d37c4b7414b5cca'
         '2832aa708f37ba5b2c5f47a95073fb82')
backup=(etc/scroll/scroll.yaml etc/scroll/key)
package() {
  mkdir -p -m=700 $pkgdir/etc/${pkgname}
  mkdir -p $pkgdir/var/log/${pkgname}
  mkdir -p $pkgdir/etc/systemd/system/timers.target.wants

  install -Dm755 ${pkgname} $pkgdir/usr/bin/${pkgname}
  install -Dm644 ${pkgname}.yaml $pkgdir/etc/${pkgname}/${pkgname}.yaml
  install -Dm600 key $pkgdir/etc/${pkgname}/key
  install -Dm644 ${pkgname}-backup.service $pkgdir/usr/lib/systemd/system/${pkgname}-backup.service
  install -Dm644 ${pkgname}-backup.timer $pkgdir/usr/lib/systemd/system/${pkgname}-backup.timer
  install -Dm644 ${pkgname}-trim.service $pkgdir/usr/lib/systemd/system/${pkgname}-trim.service
  install -Dm644 ${pkgname}-trim.timer $pkgdir/usr/lib/systemd/system/${pkgname}-trim.timer

  ln -sf /usr/lib/systemd/system/${pkgname}-backup.timer $pkgdir/etc/systemd/system/timers.target.wants
  ln -sf /usr/lib/systemd/system/${pkgname}-trim.timer $pkgdir/etc/systemd/system/timers.target.wants
}
