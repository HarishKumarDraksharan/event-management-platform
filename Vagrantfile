Vagrant.configure("2") do |config|
  config.vm.box = "ubuntu/jammy64"
  config.vm.hostname = "event-management-dev"
  config.vm.network "private_network", ip: "192.168.56.18"
  config.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1"
  config.vm.synced_folder ".", "/home/vagrant/event-management-platform"

  config.vm.provider "virtualbox" do |virtualbox|
    virtualbox.name = "EventManagement-Dev"
    virtualbox.memory = 4096
    virtualbox.cpus = 2
  end

  config.vm.provision "shell", privileged: true, inline: <<-'SHELL'
    set -eu

    if ! command -v docker >/dev/null 2>&1; then
      apt-get update
      apt-get install -y ca-certificates curl
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      chmod a+r /etc/apt/keyrings/docker.asc
      . /etc/os-release
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" > /etc/apt/sources.list.d/docker.list
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif ! docker compose version >/dev/null 2>&1; then
      apt-get update
      apt-get install -y docker-compose-plugin
    fi

    systemctl enable --now docker
    usermod -aG docker vagrant
    docker --version
    docker compose version
  SHELL
end
