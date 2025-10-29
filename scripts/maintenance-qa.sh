#!/bin/bash

# Script de Mantenimiento Preventivo para Droplet QA
# Ejecutar semanalmente para prevenir problemas

set -e

DROPLET_IP="64.225.11.130"
SSH_KEY="$HOME/.ssh/droplet_deploy"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=========================================="
echo "MANTENIMIENTO PREVENTIVO - DROPLET QA"
echo "=========================================="
echo ""

# Verificar conectividad
echo -e "${BLUE}🔍 Verificando conectividad...${NC}"
if ! timeout 5 ssh -o ConnectTimeout=3 -i "$SSH_KEY" root@"$DROPLET_IP" "echo 'OK'" &> /dev/null; then
	echo -e "${RED}❌ No se puede conectar al droplet${NC}"
	echo "Verifica que el droplet esté encendido"
	exit 1
fi
echo -e "${GREEN}✅ Conectado${NC}"
echo ""

# Ejecutar comandos de mantenimiento
echo -e "${BLUE}🧹 Ejecutando tareas de mantenimiento...${NC}"
echo ""

ssh -i "$SSH_KEY" root@"$DROPLET_IP" << 'REMOTE_MAINTENANCE'
	set -e
	
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo "📊 ESTADO ACTUAL DEL SISTEMA"
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo ""
	
	# Uso de memoria
	echo "💾 Memoria:"
	free -h | grep Mem
	MEMORY_USAGE=$(free | grep Mem | awk '{print int($3/$2 * 100)}')
	if [ "$MEMORY_USAGE" -gt 85 ]; then
		echo "⚠️  ALERTA: Uso de memoria al ${MEMORY_USAGE}%"
	fi
	echo ""
	
	# Uso de disco
	echo "💿 Disco:"
	df -h / | tail -1
	DISK_USAGE=$(df / | tail -1 | awk '{print int($3/$2 * 100)}')
	if [ "$DISK_USAGE" -gt 85 ]; then
		echo "⚠️  ALERTA: Uso de disco al ${DISK_USAGE}%"
	fi
	echo ""
	
	# Carga del sistema
	echo "⚙️  Carga del sistema:"
	uptime
	echo ""
	
	# Docker
	if command -v docker &> /dev/null; then
		echo "🐳 Docker - Uso de espacio:"
		docker system df
		echo ""
	fi
	
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo "🧹 TAREAS DE LIMPIEZA"
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo ""
	
	# Limpiar Docker
	if command -v docker &> /dev/null; then
		echo "🐳 Limpiando Docker..."
		
		# Contenedores detenidos
		STOPPED_CONTAINERS=$(docker ps -aq -f status=exited | wc -l)
		if [ "$STOPPED_CONTAINERS" -gt 0 ]; then
			echo "  - Eliminando $STOPPED_CONTAINERS contenedores detenidos..."
			docker container prune -f
		else
			echo "  - No hay contenedores detenidos"
		fi
		
		# Imágenes no usadas
		UNUSED_IMAGES=$(docker images -f "dangling=true" -q | wc -l)
		if [ "$UNUSED_IMAGES" -gt 0 ]; then
			echo "  - Eliminando $UNUSED_IMAGES imágenes sin usar..."
			docker image prune -f
		else
			echo "  - No hay imágenes sin usar"
		fi
		
		# Volúmenes no usados
		UNUSED_VOLUMES=$(docker volume ls -f "dangling=true" -q | wc -l)
		if [ "$UNUSED_VOLUMES" -gt 0 ]; then
			echo "  - Eliminando $UNUSED_VOLUMES volúmenes sin usar..."
			docker volume prune -f
		else
			echo "  - No hay volúmenes sin usar"
		fi
		
		echo ""
	fi
	
	# Limpiar logs del sistema
	echo "📝 Limpiando logs del sistema..."
	BEFORE_LOGS=$(du -sh /var/log 2>/dev/null | awk '{print $1}')
	journalctl --vacuum-time=7d &> /dev/null
	AFTER_LOGS=$(du -sh /var/log 2>/dev/null | awk '{print $1}')
	echo "  - Antes: $BEFORE_LOGS → Después: $AFTER_LOGS"
	echo ""
	
	# Limpiar caché de APT
	echo "📦 Limpiando caché de paquetes..."
	BEFORE_APT=$(du -sh /var/cache/apt 2>/dev/null | awk '{print $1}')
	apt-get clean &> /dev/null
	AFTER_APT=$(du -sh /var/cache/apt 2>/dev/null | awk '{print $1}')
	echo "  - Antes: $BEFORE_APT → Después: $AFTER_APT"
	echo ""
	
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo "🔍 VERIFICACIÓN POST-LIMPIEZA"
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo ""
	
	# Uso de disco después
	echo "💿 Disco (después de limpieza):"
	df -h / | tail -1
	echo ""
	
	# Docker después
	if command -v docker &> /dev/null; then
		echo "🐳 Docker - Uso de espacio (después):"
		docker system df
		echo ""
		
		echo "🐳 Contenedores activos:"
		docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Size}}" 2>/dev/null || echo "No hay contenedores corriendo"
		echo ""
	fi
	
	# Verificar servicios críticos
	echo "🔐 Servicios críticos:"
	echo -n "  - SSH: "
	systemctl is-active ssh
	
	if command -v docker &> /dev/null; then
		echo -n "  - Docker: "
		systemctl is-active docker
	fi
	echo ""
	
	# Logs de errores recientes
	echo "⚠️  Errores recientes (últimas 24 horas):"
	ERROR_COUNT=$(journalctl --since "24 hours ago" -p err --no-pager | wc -l)
	if [ "$ERROR_COUNT" -gt 0 ]; then
		echo "  - $ERROR_COUNT errores encontrados"
		echo "  - Para ver detalles: journalctl -p err -n 20"
	else
		echo "  - No hay errores recientes"
	fi
	echo ""
	
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo "✅ MANTENIMIENTO COMPLETADO"
	echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
	echo ""
	echo "Próximo mantenimiento recomendado: $(date -d '+7 days' '+%Y-%m-%d')"
	echo ""
REMOTE_MAINTENANCE

echo -e "${GREEN}✅ Mantenimiento completado exitosamente${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 RESUMEN"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tareas realizadas:"
echo "  ✅ Limpieza de Docker (contenedores, imágenes, volúmenes)"
echo "  ✅ Limpieza de logs del sistema (últimos 7 días)"
echo "  ✅ Limpieza de caché de paquetes"
echo "  ✅ Verificación de servicios críticos"
echo "  ✅ Revisión de errores recientes"
echo ""
echo "Recomendaciones:"
echo "  - Ejecuta este script semanalmente"
echo "  - Monitorea el uso de recursos regularmente"
echo "  - Si el uso de disco supera 85%, considera upgrade"
echo ""

