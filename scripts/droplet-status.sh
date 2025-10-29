#!/bin/bash

# Script para verificar y reparar el estado del droplet QA
# Requiere: doctl (Digital Ocean CLI)

set -e

echo "=========================================="
echo "DROPLET QA - DIAGNÓSTICO Y REPARACIÓN"
echo "=========================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar si doctl está instalado
if ! command -v doctl &> /dev/null; then
	echo -e "${RED}❌ Error: doctl no está instalado${NC}"
	echo ""
	echo "Instalar doctl:"
	echo "  macOS: brew install doctl"
	echo "  Linux: snap install doctl"
	echo ""
	echo "Configurar doctl:"
	echo "  doctl auth init"
	echo ""
	exit 1
fi

# Variables desde terraform
DROPLET_ID="526850447"
DROPLET_IP="64.225.11.130"

echo -e "${YELLOW}📊 Obteniendo información del droplet...${NC}"
echo ""

# Obtener información del droplet
DROPLET_INFO=$(doctl compute droplet get $DROPLET_ID --format ID,Name,Status,PublicIPv4,Memory,VCPUs --no-header)

if [ -z "$DROPLET_INFO" ]; then
	echo -e "${RED}❌ No se pudo obtener información del droplet${NC}"
	echo "Verifica que:"
	echo "  1. doctl está autenticado: doctl auth list"
	echo "  2. El droplet existe: doctl compute droplet list"
	exit 1
fi

echo "Información del droplet:"
echo "$DROPLET_INFO"
echo ""

# Extraer el estado
STATUS=$(echo "$DROPLET_INFO" | awk '{print $3}')

echo -e "Estado actual: ${YELLOW}$STATUS${NC}"
echo ""

# Verificar el estado
if [ "$STATUS" != "active" ]; then
	echo -e "${RED}⚠️  El droplet NO está activo${NC}"
	echo ""
	read -p "¿Deseas encender el droplet? (y/n): " -n 1 -r
	echo ""
	
	if [[ $REPLY =~ ^[Yy]$ ]]; then
		echo -e "${YELLOW}🔄 Encendiendo droplet...${NC}"
		doctl compute droplet-action power-on $DROPLET_ID --wait
		
		echo ""
		echo -e "${GREEN}✅ Droplet encendido${NC}"
		echo ""
		echo "Esperando 30 segundos para que el servidor esté listo..."
		sleep 30
	else
		echo "Operación cancelada"
		exit 0
	fi
else
	echo -e "${GREEN}✅ El droplet está activo${NC}"
fi

# Verificar conectividad
echo ""
echo -e "${YELLOW}🔍 Verificando conectividad...${NC}"
echo ""

# Ping
echo -n "Ping... "
if ping -c 2 -W 5 $DROPLET_IP &> /dev/null; then
	echo -e "${GREEN}✅ OK${NC}"
else
	echo -e "${RED}❌ FAIL${NC}"
	echo "El servidor no responde a ping"
fi

# SSH
echo -n "SSH... "
if timeout 10 ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -i ~/.ssh/droplet_deploy root@$DROPLET_IP "echo 'OK'" &> /dev/null; then
	echo -e "${GREEN}✅ OK${NC}"
else
	echo -e "${RED}❌ FAIL${NC}"
	echo "El servidor no responde a SSH"
	echo ""
	echo "Si el droplet acabas de encenderse, espera unos minutos más"
fi

# HTTP
echo -n "HTTP (puerto 80)... "
if timeout 5 curl -s -o /dev/null -w "%{http_code}" http://$DROPLET_IP | grep -q "200\|301\|302"; then
	echo -e "${GREEN}✅ OK${NC}"
else
	echo -e "${YELLOW}⚠️  No responde (puede ser normal si no hay app corriendo)${NC}"
fi

echo ""
echo "=========================================="
echo "RESUMEN"
echo "=========================================="
echo ""
echo "Droplet ID: $DROPLET_ID"
echo "Droplet IP: $DROPLET_IP"
echo "Estado: $STATUS"
echo ""
echo "Para conectarte por SSH:"
echo "  ssh root@$DROPLET_IP -i ~/.ssh/droplet_deploy"
echo ""
echo "Para ver logs:"
echo "  ssh root@$DROPLET_IP 'cd /opt/financieramente && docker-compose logs'"
echo ""

